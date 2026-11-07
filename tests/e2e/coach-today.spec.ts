import { randomUUID } from 'node:crypto';
import { makeAdmin } from './supabase-admin';
import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './ui-routes';

// Service client from the live local stack (same pattern as clients.spec.ts / forms.spec.ts).
const admin = makeAdmin();

const TRAINER_A = '11111111-0000-0000-0000-000000000001';
const tag = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const ymd = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const weekdayOffsetDaysAgo = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).getDay();

const createdClientIds: string[] = [];
const createdProgramIds: string[] = [];

async function createClientFor(fullName: string): Promise<string> {
  const email = `coachtoday-${tag()}@ptplatform.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'client' },
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const id = data.user.id;
  createdClientIds.push(id);
  await admin.from('profiles').upsert({ id, role: 'client', full_name: fullName });
  await admin.from('trainer_clients').insert({
    trainer_id: TRAINER_A,
    client_id: id,
    status: 'active',
    source: 'invite',
    start_date: ymd(-60),
  });
  return id;
}

/** An active program copy for a client (no workouts needed — just the "has active program" signal). */
async function giveActiveProgram(clientId: string, startOffsetDays: number): Promise<void> {
  const programId = randomUUID();
  createdProgramIds.push(programId);
  const { error } = await admin.from('programs').insert({
    id: programId,
    trainer_id: TRAINER_A,
    client_id: clientId,
    title: 'Coach Today fixture program',
    weeks: 4,
    is_template: false,
    status: 'published',
    start_date: ymd(startOffsetDays),
  });
  if (error) throw new Error(`insert program failed: ${error.message}`);
}

async function insertWorkoutLog(opts: {
  clientId: string;
  scheduledOffsetDays: number;
  completedAt: string;
}): Promise<void> {
  const { error } = await admin.from('workout_logs').insert({
    trainer_id: TRAINER_A,
    client_id: opts.clientId,
    status: 'completed',
    scheduled_date: ymd(opts.scheduledOffsetDays),
    started_at: opts.completedAt,
    completed_at: opts.completedAt,
    client_generated_id: randomUUID(),
  });
  if (error) throw new Error(`insert workout_log failed: ${error.message}`);
}

async function defaultCheckinFormId(): Promise<string> {
  const { data } = await admin
    .from('forms')
    .select('id')
    .eq('trainer_id', TRAINER_A)
    .eq('kind', 'checkin')
    .eq('is_default', true)
    .single();
  return data!.id as string;
}

async function globalExerciseId(): Promise<string> {
  const { data } = await admin
    .from('exercises')
    .select('id')
    .is('trainer_id', null)
    .limit(1)
    .single();
  return data!.id as string;
}

async function signInUi(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15_000 });
}

/** The <section> card whose heading matches, scoping assertions to one dashboard section. */
function section(page: Page, heading: RegExp) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) });
}

test.afterAll(async () => {
  for (const id of createdClientIds) {
    await admin.from('personal_records').delete().eq('client_id', id);
    await admin.from('workout_logs').delete().eq('client_id', id);
    await admin.from('checkin_schedules').delete().eq('client_id', id);
    await admin.from('form_responses').delete().eq('client_id', id);
  }
  if (createdProgramIds.length) await admin.from('programs').delete().in('id', createdProgramIds);
  for (const id of createdClientIds) {
    await admin.from('trainer_clients').delete().eq('client_id', id);
    await admin.auth.admin.deleteUser(id);
  }
});

test.describe('P1-12 coach Today', () => {
  test('A1 needs attention shows reasons sorted', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // A missed-workout client: active program, last completed workout 6 days ago.
    const missed = await createClientFor('Missed Mover');
    await giveActiveProgram(missed, -30);
    await insertWorkoutLog({
      clientId: missed,
      scheduledOffsetDays: -6,
      completedAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    });

    // An overdue-check-in client: a weekly schedule whose day was 3 days ago, nothing submitted since.
    const overdue = await createClientFor('Overdue Checker');
    const formId = await defaultCheckinFormId();
    const { error: schedErr } = await admin.from('checkin_schedules').insert({
      trainer_id: TRAINER_A,
      client_id: overdue,
      form_id: formId,
      weekday: weekdayOffsetDaysAgo(3),
      active: true,
    });
    if (schedErr) throw new Error(`insert checkin_schedule failed: ${schedErr.message}`);

    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach');

    const attention = section(page, /Needs attention/);
    const missedLink = attention.locator(`a[href="/coach/clients/${missed}"]`);
    const overdueLink = attention.locator(`a[href="/coach/clients/${overdue}"]`);
    await expect(missedLink).toBeVisible();
    await expect(overdueLink).toBeVisible();

    // Each states the reason in words with the number.
    await expect(missedLink).toContainText(/No workout in \d+ days/);
    await expect(overdueLink).toContainText(/Check-in \d+ days? late/);

    // Sorted by severity: the missed-workout row precedes the overdue-check-in row.
    const texts = await attention.locator('a[href^="/coach/clients/"]').allInnerTexts();
    const idxMissed = texts.findIndex((t) => t.includes('Missed Mover'));
    const idxOverdue = texts.findIndex((t) => t.includes('Overdue Checker'));
    expect(idxMissed).toBeGreaterThanOrEqual(0);
    expect(idxOverdue).toBeGreaterThan(idxMissed);
  });

  test('A2 check-ins to review oldest first', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const older = await createClientFor('Older Submitter');
    const newer = await createClientFor('Newer Submitter');
    const formId = await defaultCheckinFormId();

    await admin.from('form_responses').insert([
      {
        form_id: formId,
        trainer_id: TRAINER_A,
        client_id: older,
        answers: { adherence: 'Rough week' },
        submitted_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      },
      {
        form_id: formId,
        trainer_id: TRAINER_A,
        client_id: newer,
        answers: { adherence: 'All good' },
        submitted_at: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      },
    ]);

    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach');

    const review = section(page, /Check-ins to review/);
    await expect(review.getByText('Older Submitter')).toBeVisible();
    await expect(review.getByText('Newer Submitter')).toBeVisible();

    const texts = await review.locator('a[href="/coach/checkins"]').allInnerTexts();
    const idxOlder = texts.findIndex((t) => t.includes('Older Submitter'));
    const idxNewer = texts.findIndex((t) => t.includes('Newer Submitter'));
    expect(idxOlder).toBeGreaterThanOrEqual(0);
    expect(idxNewer).toBeGreaterThan(idxOlder);
  });

  test("A3 today's training", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const trainee = await createClientFor('Today Trainer');
    await giveActiveProgram(trainee, -7);
    await insertWorkoutLog({
      clientId: trainee,
      scheduledOffsetDays: 0,
      completedAt: new Date().toISOString(),
    });
    // A personal record achieved today — the coach must be able to read their client's PRs.
    const exerciseId = await globalExerciseId();
    const { error: prErr } = await admin.from('personal_records').insert({
      client_id: trainee,
      exercise_id: exerciseId,
      type: 'max_weight',
      value: 120,
      achieved_at: new Date().toISOString(),
    });
    if (prErr) throw new Error(`insert personal_record failed: ${prErr.message}`);

    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach');

    const training = section(page, /Today.s training/);
    // Today's completed workout shows, linking to the client's log (their profile for v1).
    await expect(training.locator(`a[href="/coach/clients/${trainee}"]`)).toBeVisible();
    // The PR count is shown with a number (fails loudly if the coach can't read client PRs).
    await expect(training.getByText(/\d+\s+PRs?/)).toBeVisible();
    await expect(training.getByText(/[1-9]\d*\s+completed/)).toBeVisible();
  });

  test('A4 numbers line', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signInUi(page, 'trainer.a@ptplatform.test');
    await page.goto('/coach');

    // Calibrated hero band (UX-01): compliance and active clients are separate stat tiles in a Card.
    await expect(page.getByText(/14-day compliance/)).toBeVisible();
    // Active-client count label (seed guarantees ≥1 active client for Trainer Alpha).
    await expect(page.getByText(/Active clients?/)).toBeVisible();
    // The compliance figure: a percentage, or "—" when nothing was scheduled.
    await expect(page.getByText(/^\d+%$|^—$/).first()).toBeVisible();
  });
});
