-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "profile_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "replaced_by_token_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT 'Kairos Voyager',
    "handle" VARCHAR(50),
    "bio" TEXT,
    "quote" VARCHAR(255),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "circadian_type" VARCHAR(50) NOT NULL DEFAULT 'moderate_early',
    "avatar_url" VARCHAR(512),
    "banner_theme" VARCHAR(50),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "dob" VARCHAR(20),
    "occupation" VARCHAR(50),
    "goals" JSONB,
    "monthly_focus" VARCHAR(100),
    "workflow" VARCHAR(50),
    "energy_peak" VARCHAR(50),
    "challenges" JSONB,
    "companion_name" VARCHAR(50),
    "archetype" VARCHAR(50),
    "voice_model" VARCHAR(50),
    "pace" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progression_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "xp_remainder" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "today_hp" INTEGER NOT NULL DEFAULT 0,
    "lifetime_hp" INTEGER NOT NULL DEFAULT 0,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" VARCHAR(10) NOT NULL DEFAULT '',
    "level_up_history" JSONB,
    "version" BIGINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "progression_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'daily',
    "target_hp" INTEGER NOT NULL DEFAULT 15,
    "start_time" VARCHAR(10),
    "end_time" VARCHAR(10),
    "duration_minutes" INTEGER,
    "is_custom" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" VARCHAR(64) NOT NULL,
    "completion_date" VARCHAR(10) NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "earned_xp" DOUBLE PRECISION NOT NULL,
    "earned_hp" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" VARCHAR(64) NOT NULL,
    "current_progress" INTEGER NOT NULL DEFAULT 0,
    "target_progress" INTEGER NOT NULL DEFAULT 1,
    "is_unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlocked_at" TIMESTAMPTZ,
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,
    "reward_xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "reward_hp_awarded" INTEGER NOT NULL DEFAULT 0,
    "idempotency_key" VARCHAR(128),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "achievement_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'deep_work',
    "duration_seconds" INTEGER NOT NULL,
    "target_duration_minutes" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL,
    "flow_score" INTEGER,
    "rating" INTEGER,
    "notes" TEXT,
    "interrupted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reflections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "mood" VARCHAR(50),
    "energy_score" INTEGER,
    "focus_rating" INTEGER,
    "wins" JSONB,
    "journal_text" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "daily_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squads" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "handle" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "banner_url" VARCHAR(512),
    "league_tier" VARCHAR(50) NOT NULL DEFAULT 'Bronze',
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "member_count" INTEGER NOT NULL DEFAULT 1,
    "max_members" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_members" (
    "id" UUID NOT NULL,
    "squad_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'member',
    "contribution_points" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "squad_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squad_challenges" (
    "id" UUID NOT NULL,
    "squad_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "target_count" INTEGER NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "squad_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" UUID NOT NULL,
    "initiator_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_operations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(128) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "operation_type" VARCHAR(50) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PROCESSED',
    "client_timestamp" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "progression_states_user_id_key" ON "progression_states"("user_id");

-- CreateIndex
CREATE INDEX "tasks_user_id_is_active_idx" ON "tasks"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_user_id_task_id_key" ON "tasks"("user_id", "task_id");

-- CreateIndex
CREATE INDEX "task_completions_user_id_completion_date_idx" ON "task_completions"("user_id", "completion_date");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_user_id_task_id_completion_date_key" ON "task_completions"("user_id", "task_id", "completion_date");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_user_id_idempotency_key_key" ON "task_completions"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "achievement_progress_user_id_is_unlocked_idx" ON "achievement_progress"("user_id", "is_unlocked");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_progress_user_id_achievement_id_key" ON "achievement_progress"("user_id", "achievement_id");

-- CreateIndex
CREATE INDEX "focus_sessions_user_id_completed_at_idx" ON "focus_sessions"("user_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_user_id_session_id_key" ON "focus_sessions"("user_id", "session_id");

-- CreateIndex
CREATE INDEX "daily_reflections_user_id_date_idx" ON "daily_reflections"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reflections_user_id_date_key" ON "daily_reflections"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "squads_handle_key" ON "squads"("handle");

-- CreateIndex
CREATE INDEX "squad_members_user_id_idx" ON "squad_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "squad_members_squad_id_user_id_key" ON "squad_members"("squad_id", "user_id");

-- CreateIndex
CREATE INDEX "squad_challenges_squad_id_is_completed_idx" ON "squad_challenges"("squad_id", "is_completed");

-- CreateIndex
CREATE INDEX "connections_receiver_id_status_idx" ON "connections"("receiver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connections_initiator_id_receiver_id_key" ON "connections"("initiator_id", "receiver_id");

-- CreateIndex
CREATE INDEX "sync_operations_user_id_entity_type_idx" ON "sync_operations"("user_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "sync_operations_user_id_idempotency_key_key" ON "sync_operations"("user_id", "idempotency_key");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_states" ADD CONSTRAINT "progression_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_progress" ADD CONSTRAINT "achievement_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reflections" ADD CONSTRAINT "daily_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squad_challenges" ADD CONSTRAINT "squad_challenges_squad_id_fkey" FOREIGN KEY ("squad_id") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
