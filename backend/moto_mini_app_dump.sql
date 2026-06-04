--
-- PostgreSQL database dump
--

\restrict Opvjuunfn8VDED6q049V0M5X7H96OABPf3sL9r8S0ah3OSbhXwcceWRvAEUdaHR

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BookingSlotStatus; Type: TYPE; Schema: public; Owner: moto
--

CREATE TYPE public."BookingSlotStatus" AS ENUM (
    'available',
    'requested',
    'reschedule',
    'confirmed',
    'completed',
    'cancelled'
);


ALTER TYPE public."BookingSlotStatus" OWNER TO moto;

--
-- Name: StudentLevel; Type: TYPE; Schema: public; Owner: moto
--

CREATE TYPE public."StudentLevel" AS ENUM (
    'BEGINNER',
    'BASIC',
    'INTERMEDIATE',
    'ADVANCED'
);


ALTER TYPE public."StudentLevel" OWNER TO moto;

--
-- Name: TrainingPackagePaymentStatus; Type: TYPE; Schema: public; Owner: moto
--

CREATE TYPE public."TrainingPackagePaymentStatus" AS ENUM (
    'unpaid',
    'paid',
    'partial'
);


ALTER TYPE public."TrainingPackagePaymentStatus" OWNER TO moto;

--
-- Name: TrainingPackageStatus; Type: TYPE; Schema: public; Owner: moto
--

CREATE TYPE public."TrainingPackageStatus" AS ENUM (
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE public."TrainingPackageStatus" OWNER TO moto;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: moto
--

CREATE TYPE public."UserRole" AS ENUM (
    'INSTRUCTOR',
    'STUDENT'
);


ALTER TYPE public."UserRole" OWNER TO moto;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: BookingSlot; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."BookingSlot" (
    id text NOT NULL,
    "startsAt" timestamp(3) without time zone NOT NULL,
    "endsAt" timestamp(3) without time zone NOT NULL,
    status public."BookingSlotStatus" DEFAULT 'available'::public."BookingSlotStatus" NOT NULL,
    title text,
    location text,
    notes text,
    "instructorId" text,
    "studentId" text,
    "requestedById" text,
    "requestedAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    preference text,
    "studentComment" text,
    "finalLocation" text,
    "finalLocationUrl" text,
    "instructorComment" text,
    "previousStartsAt" timestamp(3) without time zone,
    "previousDurationMinutes" integer,
    CONSTRAINT "BookingSlot_previousDurationMinutes_check" CHECK ((("previousDurationMinutes" IS NULL) OR ("previousDurationMinutes" >= 0)))
);


ALTER TABLE public."BookingSlot" OWNER TO moto;

--
-- Name: CalendarSyncEvent; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."CalendarSyncEvent" (
    id text NOT NULL,
    "bookingSlotId" text NOT NULL,
    provider text NOT NULL,
    "externalEventId" text,
    payload jsonb,
    "syncedAt" timestamp(3) without time zone,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CalendarSyncEvent" OWNER TO moto;

--
-- Name: Skill; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."Skill" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Skill" OWNER TO moto;

--
-- Name: Student; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."Student" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    "telegramUsername" text,
    level public."StudentLevel" DEFAULT 'BEGINNER'::public."StudentLevel" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    focus text,
    "nextTrainingPlan" text
);


ALTER TABLE public."Student" OWNER TO moto;

--
-- Name: StudentSkill; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."StudentSkill" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "skillId" text NOT NULL,
    percent integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "StudentSkill_percent_check" CHECK (((percent >= 0) AND (percent <= 100)))
);


ALTER TABLE public."StudentSkill" OWNER TO moto;

--
-- Name: TrainingHistory; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."TrainingHistory" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "bookingSlotId" text,
    "reportId" text,
    "trainedAt" timestamp(3) without time zone NOT NULL,
    summary text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TrainingHistory" OWNER TO moto;

--
-- Name: TrainingPackage; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."TrainingPackage" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    title text NOT NULL,
    "totalSessions" integer NOT NULL,
    "usedSessions" integer DEFAULT 0 NOT NULL,
    "paymentStatus" public."TrainingPackagePaymentStatus" DEFAULT 'unpaid'::public."TrainingPackagePaymentStatus" NOT NULL,
    status public."TrainingPackageStatus" DEFAULT 'active'::public."TrainingPackageStatus" NOT NULL,
    "purchasedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    CONSTRAINT "TrainingPackage_totalSessions_check" CHECK (("totalSessions" >= 0)),
    CONSTRAINT "TrainingPackage_usedSessions_check" CHECK (("usedSessions" >= 0))
);


ALTER TABLE public."TrainingPackage" OWNER TO moto;

--
-- Name: TrainingReport; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."TrainingReport" (
    id text NOT NULL,
    "bookingSlotId" text NOT NULL,
    "studentId" text NOT NULL,
    "instructorId" text,
    "trainedOn" text NOT NULL,
    successes text NOT NULL,
    "focusNext" text NOT NULL,
    "levelChange" public."StudentLevel",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TrainingReport" OWNER TO moto;

--
-- Name: TrainingVideo; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."TrainingVideo" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "trainingHistoryId" text,
    "reportId" text,
    "telegramUrl" text NOT NULL,
    title text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TrainingVideo" OWNER TO moto;

--
-- Name: User; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "telegramId" text,
    "telegramUsername" text,
    "displayName" text NOT NULL,
    role public."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO moto;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: moto
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO moto;

--
-- Data for Name: BookingSlot; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."BookingSlot" (id, "startsAt", "endsAt", status, title, location, notes, "instructorId", "studentId", "requestedById", "requestedAt", "confirmedAt", "cancelledAt", "cancellationReason", "createdAt", "updatedAt", preference, "studentComment", "finalLocation", "finalLocationUrl", "instructorComment", "previousStartsAt", "previousDurationMinutes") FROM stdin;
5d3c106f-c7c5-480e-b05b-3852a5bd332b	2026-05-28 15:00:00	2026-05-28 16:30:00	completed	Площадка	Учебная площадка	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-05-26 12:00:00	2026-05-26 13:00:00	\N	\N	2026-06-01 15:16:07.976	2026-06-01 15:23:43.625	\N	\N	\N	\N	\N	\N	\N
6236c430-d893-4170-8228-d07fca33a510	2026-06-22 14:30:00	2026-06-22 16:00:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 16:08:13.935	2026-06-03 16:08:26.332	\N	\N	2026-06-03 16:06:34.69	2026-06-03 16:08:26.333	Не знаю / нужна консультация		Площадка Запад	https://maps.google.com/?q=Ploshchadka+Zapad	Встречаемся у въезда на площадку, возьмите закрытую обувь.	\N	\N
01375833-23ca-4604-8bec-8fba28237288	2026-06-10 10:00:00	2026-06-10 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	7262fa73-93dd-4a8f-8552-2928375eea81	262901ee-ab80-47ca-abc9-21072c8d742b	2026-06-02 05:58:41.55	2026-06-02 05:58:41.585	\N	\N	2026-06-02 05:58:41.524	2026-06-02 05:58:41.621	утро	хочу повторить базу	Учебная площадка	https://maps.example.com/track	берем конусы	\N	\N
a6947460-c8e7-45c2-9df6-e5428ed6431f	2026-06-22 10:00:00	2026-06-22 11:30:00	available	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	\N	\N	\N	\N	\N	\N	2026-06-03 16:27:30.326	2026-06-03 16:27:30.382	\N	\N	\N	\N	\N	\N	\N
b3542d69-9109-4921-9221-c582189ee618	2026-06-11 10:00:00	2026-06-11 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	80003e02-50ff-41a7-b63b-57effc95f6f2	32a416a2-f22d-48dd-afb9-670a053a1c16	2026-06-02 06:03:05.717	2026-06-02 06:03:05.739	\N	\N	2026-06-02 06:03:05.697	2026-06-02 06:03:05.765	утро	хочу повторить базу	Учебная площадка	https://maps.example.com/track	берем конусы	\N	\N
d6308ff7-b286-463d-b75b-3e3b34433669	2026-06-25 10:00:00	2026-06-25 11:30:00	available	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	\N	\N	\N	\N	\N	\N	2026-06-03 16:27:32.454	2026-06-03 16:27:32.454	\N	\N	\N	\N	\N	\N	\N
ded0f518-bc9a-4694-be0d-14ab37ba254b	2026-06-05 15:00:00	2026-06-05 16:30:00	confirmed	Заявка на тренировку	Учебная площадка	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	38788506-c200-4a8d-8f06-00567e1681e9	83926141-4dd7-4df4-b55c-710699023a6d	2026-06-01 09:00:00	2026-06-02 12:07:27.731	\N	\N	2026-06-01 15:16:08.019	2026-06-02 12:07:27.731	\N	\N	Заявка на тренировку	\N	Встречаемся у въезда на площадку, возьмите закрытую обувь.	\N	\N
8464d0b2-be60-4c9b-ae90-f7bd86d8e022	2026-06-26 10:00:00	2026-06-26 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	24de067a-8d7d-4f52-ba85-8e22909e5499	3179fbdf-26e1-4854-8db2-9c9b7343e5c9	2026-06-03 16:27:32.76	2026-06-03 16:27:32.782	\N	\N	2026-06-03 16:27:32.733	2026-06-03 16:27:32.816	утро	cancel flow	Учебная площадка	https://maps.example.com/cancel	confirmed	\N	\N
c21b86e1-1718-4341-a346-f92aa27d7044	2026-06-03 14:30:00	2026-06-03 16:00:00	requested	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 16:57:25.497	\N	\N	\N	2026-06-03 16:06:57.945	2026-06-03 16:57:25.498	Не знаю / нужна консультация		\N	\N	\N	\N	\N
b07e67f4-c71f-4b9f-981b-0f367393545f	2026-06-16 12:00:00	2026-06-16 13:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	8d3b8b10-52a3-434a-b63b-90a6cd74e52e	6ed99503-c829-460b-ae43-264cb550ec94	2026-06-02 12:24:09.292	2026-06-02 12:24:09.428	\N	\N	2026-06-02 12:24:09.221	2026-06-02 12:24:09.43	\N	\N	Площадка 2	\N	Переносим	\N	\N
83837106-b6ab-4483-8aab-55a574abcf14	2026-06-03 14:30:00	2026-06-03 16:00:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 15:41:44.988	2026-06-03 16:57:44.062	\N	\N	2026-06-02 12:26:58.333	2026-06-03 16:57:44.063	Не знаю / нужна консультация		Площадка Запад	https://maps.google.com/?q=Ploshchadka+Zapad	Встречаемся у въезда на площадку, возьмите закрытую обувь.	2026-06-16 14:30:00	90
1fe1bb20-9a4d-4c66-a8c9-8b0be68f8839	2026-06-21 10:00:00	2026-06-21 11:30:00	requested	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 17:03:48.988	\N	\N	\N	2026-06-03 16:27:30.244	2026-06-03 17:03:48.989	Не знаю / нужна консультация		\N	\N	\N	\N	\N
384a3ed6-2281-42d1-8a31-e39c87614164	2026-06-24 12:00:00	2026-06-24 13:30:00	requested	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 17:04:37.731	\N	\N	\N	2026-06-03 16:27:32.229	2026-06-03 17:04:37.732	Не знаю / нужна консультация		\N	\N	\N	\N	\N
5ca685db-fbcc-4597-ab54-e05e80de5f34	2026-05-18 06:00:00	2026-05-18 07:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	5cb7c51f-7212-4202-a9f3-bdf3d1329945	cf2be56d-0a87-4f37-b9fb-ba8dc0ead90c	2026-06-03 10:37:35.328	2026-06-03 10:53:29.679	\N	\N	2026-06-03 10:37:35.318	2026-06-03 10:53:29.68	\N	\N	Свободный слот	\N	Встречаемся у въезда на площадку, возьмите закрытую обувь.	2026-05-17 14:30:00	90
d06dbec9-09bf-4f1c-a6a8-23e76f061cba	2026-06-26 10:00:00	2026-06-26 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	905aae25-b7d8-4fa3-bae2-708950b29ee7	81466204-7645-4f0a-b486-b27723e83d4c	2026-06-03 11:31:02.509	2026-06-03 11:31:02.511	\N	\N	2026-06-03 11:31:02.508	2026-06-03 11:31:02.52	утро	cancel flow	Учебная площадка	https://maps.example.com/cancel	confirmed	\N	\N
6a3bc619-df79-4c54-8908-51892ab1ac53	2026-06-24 12:00:00	2026-06-24 13:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	2026-06-03 16:06:18.041	2026-06-03 16:06:30.174	\N	\N	2026-06-03 15:54:43.786	2026-06-03 16:06:30.175	Не знаю / нужна консультация		Площадка Запад	https://maps.google.com/?q=Ploshchadka+Zapad	Встречаемся у въезда на площадку, возьмите закрытую обувь.	\N	\N
64c91c56-27fe-4a05-9c97-62c561b1dbcc	2026-06-26 10:00:00	2026-06-26 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	009df4af-ace7-4022-a62a-a246616e16b3	7d56ef7c-ea30-4c35-a13f-5fc6b886a78a	2026-06-03 11:56:49.202	2026-06-03 11:56:49.208	\N	\N	2026-06-03 11:56:49.196	2026-06-03 11:56:49.221	утро	cancel flow	Учебная площадка	https://maps.example.com/cancel	confirmed	\N	\N
4d77828d-b49c-4630-a457-a1157fba41c1	2026-06-03 06:00:00	2026-06-03 07:30:00	requested	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	bc67b5de-c791-4c9c-a8f1-efd7308f02b1	90246eba-dce1-4b0b-a566-7362d7638050	2026-06-03 16:23:03.528	\N	\N	\N	2026-06-03 16:23:03.502	2026-06-03 16:23:03.529	today	check	\N	\N	\N	\N	\N
e5325982-36cc-4107-b75d-61cdc989726a	2026-06-03 12:00:00	2026-06-03 13:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	bc67b5de-c791-4c9c-a8f1-efd7308f02b1	90246eba-dce1-4b0b-a566-7362d7638050	2026-06-03 16:23:03.598	2026-06-03 16:23:03.608	\N	\N	2026-06-03 16:23:03.589	2026-06-03 16:23:03.609	today	check	Площадка	\N	\N	\N	\N
fdb1026a-3c7b-4ef3-b61e-df81cc81093f	2026-06-03 10:00:00	2026-06-03 11:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	bc67b5de-c791-4c9c-a8f1-efd7308f02b1	90246eba-dce1-4b0b-a566-7362d7638050	2026-06-03 16:23:03.563	2026-06-03 17:04:59.793	\N	\N	2026-06-03 16:23:03.548	2026-06-03 17:04:59.795	today	check	today	\N	Встречаемся у въезда на площадку, возьмите закрытую обувь.	2026-06-03 08:00:00	90
b66cf370-c429-4262-821c-9a84ea929ddc	2026-06-23 10:00:00	2026-06-23 11:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	6011d9d6-e0e3-46ce-9640-5af0a378a3e9	321621d9-50ca-4b29-94d0-bd6d35c309b2	2026-06-03 15:54:43.727	2026-06-03 15:54:43.764	\N	\N	2026-06-03 15:54:43.709	2026-06-03 15:54:43.765	утро	cancel flow	Учебная площадка	https://maps.example.com/cancel	confirmed	\N	\N
2d281eea-287e-468a-b1bb-49136cfc7274	2026-06-26 10:00:00	2026-06-26 11:30:00	completed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	d383e257-b6c1-4c37-94e0-41cac17ddf30	343559b6-1893-48ff-93d9-1238e068ccfd	2026-06-03 15:54:43.986	2026-06-03 15:54:44.016	\N	\N	2026-06-03 15:54:43.962	2026-06-03 15:54:44.065	утро	cancel flow	Учебная площадка	https://maps.example.com/cancel	confirmed	\N	\N
10d844e8-adcd-4f73-a3c5-c0740562f9ba	2026-03-02 07:00:00	2026-03-02 08:30:00	confirmed	Свободный слот	\N	\N	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	22fa8b97-1c35-4ec1-83c2-777f8a7ea1ff	c93757a8-3b35-4a25-b1b8-cb02a30180dd	2026-06-03 15:51:04.042	2026-06-03 15:51:04.055	\N	\N	2026-06-03 15:51:04.034	2026-06-03 15:51:04.056	\N	\N	Площадка B	\N	перенос на 2 марта	2026-03-01 14:00:00	90
\.


--
-- Data for Name: CalendarSyncEvent; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."CalendarSyncEvent" (id, "bookingSlotId", provider, "externalEventId", payload, "syncedAt", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Skill; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."Skill" (id, name, description, "createdAt", "updatedAt") FROM stdin;
6e4878d6-33b9-4d0d-a1eb-b800d1ca690e	Овал	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
fff57a40-b3bd-432f-82fc-85eb51f72cb6	Торможение	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
e9a54456-73b9-4ba0-ae7b-fd8bc58d83e1	Медленная езда	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
34d3fa23-fe49-45b5-8a0b-f9b1304cdf33	Город	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
481fccb1-33ef-4ff5-922d-0840bde940f2	Развороты	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
dc9e3592-fded-475d-a8e6-d4154ff0cccb	Восьмерка	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
c08571a8-9a83-49fb-b545-3a83098b9081	Взгляд	\N	2026-06-01 15:16:07.201	2026-06-01 15:16:07.201
e3d2e667-b0f9-44e9-96b3-4cb95ccb244d	Змейка	\N	2026-06-01 15:16:07.2	2026-06-01 15:16:07.2
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."Student" (id, "userId", name, "telegramUsername", level, notes, "createdAt", "updatedAt", focus, "nextTrainingPlan") FROM stdin;
1827d794-aff6-4597-95b8-63528da32a02	f7f46558-12a7-47d6-a178-1c4aaf047a4e	Алексей	alex_moto	BASIC	Учится уверенно проходить площадку.	2026-06-01 15:16:07.37	2026-06-01 15:16:07.37	\N	\N
38788506-c200-4a8d-8f06-00567e1681e9	83926141-4dd7-4df4-b55c-710699023a6d	Мария	maria_rides	BEGINNER	\N	2026-06-01 15:16:07.467	2026-06-01 15:16:07.467	\N	\N
7262fa73-93dd-4a8f-8552-2928375eea81	262901ee-ab80-47ca-abc9-21072c8d742b	Pass4 Test Student	pass4_1780379921053	INTERMEDIATE	\N	2026-06-02 05:58:41.313	2026-06-02 05:58:41.625	Восьмерка	Медленная езда
80003e02-50ff-41a7-b63b-57effc95f6f2	32a416a2-f22d-48dd-afb9-670a053a1c16	Postman Write Student	postman_write_1780380185	INTERMEDIATE	\N	2026-06-02 06:03:05.542	2026-06-02 06:03:05.767	Восьмерка	Медленная езда
690e7c99-d99e-4f24-aa90-6fd02c3495da	3731d8ca-2942-4505-a2fe-5f7d25eefbf6	иии	\N	BEGINNER	\N	2026-06-02 10:58:15.023	2026-06-02 10:58:59.484	иии	иии
8d3b8b10-52a3-434a-b63b-90a6cd74e52e	6ed99503-c829-460b-ae43-264cb550ec94	Reschedule Test	reschedule_1780403048479	BEGINNER	\N	2026-06-02 12:24:09.036	2026-06-02 12:24:09.036	\N	\N
5cb7c51f-7212-4202-a9f3-bdf3d1329945	cf2be56d-0a87-4f37-b9fb-ba8dc0ead90c	Previous Fields Test	previous_1780483055123	BEGINNER	\N	2026-06-03 10:37:35.276	2026-06-03 10:37:35.276	\N	\N
85d55262-80df-4652-b9e4-c6fcc581df4a	3dbea658-48d7-4ad0-a1c4-a5b7bd34c504	cancel_requested Student	cancel_requested_1780486262241_1830	BEGINNER	\N	2026-06-03 11:31:02.338	2026-06-03 11:31:02.338	\N	\N
24fe585a-21c0-4a3d-97bd-e96aef13ecb2	ef302906-7231-4f2a-865f-97a1b4d03f64	cancel_confirmed Student	cancel_confirmed_1780486262241_2195	BEGINNER	\N	2026-06-03 11:31:02.432	2026-06-03 11:31:02.432	\N	\N
64efbcc4-f282-4fb4-9c5b-728ad6428fe3	17f729d3-eac7-4918-affd-6fe8b6916369	cancel_reschedule Student	cancel_reschedule_1780486262241_7509	BEGINNER	\N	2026-06-03 11:31:02.473	2026-06-03 11:31:02.473	\N	\N
905aae25-b7d8-4fa3-bae2-708950b29ee7	81466204-7645-4f0a-b486-b27723e83d4c	cancel_completed Student	cancel_completed_1780486262241_6398	BEGINNER	\N	2026-06-03 11:31:02.504	2026-06-03 11:31:02.504	\N	\N
5622d606-d5b1-405a-a8d9-8f9928156c95	023057a0-265e-4179-98f8-9b4aada6b710	cancel_requested Student	cancel_requested_1780487808897_32346	BEGINNER	\N	2026-06-03 11:56:49.011	2026-06-03 11:56:49.011	\N	\N
a0119962-1690-4d11-b491-5acdbdd876c5	e195e25f-7cef-4261-8081-9f70265bd48f	cancel_confirmed Student	cancel_confirmed_1780487808897_44581	BEGINNER	\N	2026-06-03 11:56:49.083	2026-06-03 11:56:49.083	\N	\N
470305ab-b669-45c9-9c5b-c66cdadc862f	44b2f1f3-0702-4885-a20b-537b02d80466	cancel_reschedule Student	cancel_reschedule_1780487808897_4719	BEGINNER	\N	2026-06-03 11:56:49.141	2026-06-03 11:56:49.141	\N	\N
009df4af-ace7-4022-a62a-a246616e16b3	7d56ef7c-ea30-4c35-a13f-5fc6b886a78a	cancel_completed Student	cancel_completed_1780487808897_63754	BEGINNER	\N	2026-06-03 11:56:49.188	2026-06-03 11:56:49.188	\N	\N
22fa8b97-1c35-4ec1-83c2-777f8a7ea1ff	c93757a8-3b35-4a25-b1b8-cb02a30180dd	Reschedule New Flow	new_reschedule_1780501863623	BEGINNER	\N	2026-06-03 15:51:03.921	2026-06-03 15:51:03.921	\N	\N
8b77744d-f48c-4e47-916a-94e0db938149	40d33190-6304-4423-9ab9-9bc25fe3a1f7	cancel_requested Student	cancel_requested_1780502082806_26574	BEGINNER	\N	2026-06-03 15:54:42.993	2026-06-03 15:54:42.993	\N	\N
d6775f2a-fcb9-4493-b0ff-7a54a68d73d6	0f22fc3a-d1bf-4309-9500-5795aea901fe	cancel_confirmed Student	cancel_confirmed_1780502082806_39702	BEGINNER	\N	2026-06-03 15:54:43.504	2026-06-03 15:54:43.504	\N	\N
6011d9d6-e0e3-46ce-9640-5af0a378a3e9	321621d9-50ca-4b29-94d0-bd6d35c309b2	cancel_reschedule Student	cancel_reschedule_1780502082806_2148	BEGINNER	\N	2026-06-03 15:54:43.687	2026-06-03 15:54:43.687	\N	\N
d383e257-b6c1-4c37-94e0-41cac17ddf30	343559b6-1893-48ff-93d9-1238e068ccfd	cancel_completed Student	cancel_completed_1780502082806_79388	BEGINNER	\N	2026-06-03 15:54:43.935	2026-06-03 15:54:43.935	\N	\N
bc67b5de-c791-4c9c-a8f1-efd7308f02b1	90246eba-dce1-4b0b-a566-7362d7638050	rollback Student	rollback_1780503782562_2789	BEGINNER	\N	2026-06-03 16:23:03.394	2026-06-03 16:23:03.394	\N	\N
1ef825f1-76cc-4577-aa65-e6584defdaf9	6bd02805-cf2a-49ad-9c3b-dfbd2c452467	cancel_requested Student	cancel_requested_1780504050087_51741	BEGINNER	\N	2026-06-03 16:27:30.207	2026-06-03 16:27:30.207	\N	\N
e3ae5ef5-8541-45e6-b667-3820d62d09fc	4ab113f8-911b-4cac-a1b7-962df3d0db4b	cancel_confirmed Student	cancel_confirmed_1780504050087_76665	BEGINNER	\N	2026-06-03 16:27:30.311	2026-06-03 16:27:30.311	\N	\N
2ea2db58-633c-489e-a09b-1c0565a0d13e	6fb4d5a6-a58f-4459-905f-5fe45458c7dd	cancel_reschedule Student	cancel_reschedule_1780504050087_14291	BEGINNER	\N	2026-06-03 16:27:32.155	2026-06-03 16:27:32.155	\N	\N
24de067a-8d7d-4f52-ba85-8e22909e5499	3179fbdf-26e1-4854-8db2-9c9b7343e5c9	cancel_completed Student	cancel_completed_1780504050087_52590	BEGINNER	\N	2026-06-03 16:27:32.69	2026-06-03 16:27:32.69	\N	\N
\.


--
-- Data for Name: StudentSkill; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."StudentSkill" (id, "studentId", "skillId", percent, "createdAt", "updatedAt") FROM stdin;
1061908f-bbb6-49b4-a7a5-483fe2a56eb3	1827d794-aff6-4597-95b8-63528da32a02	6e4878d6-33b9-4d0d-a1eb-b800d1ca690e	70	2026-06-01 15:16:07.912	2026-06-01 15:16:07.912
32f19f68-adea-4c57-ba3f-4abc807f5a2f	1827d794-aff6-4597-95b8-63528da32a02	dc9e3592-fded-475d-a8e6-d4154ff0cccb	55	2026-06-01 15:16:07.912	2026-06-01 15:16:07.912
61c659a9-8774-4e7f-83c3-3aef319d6264	1827d794-aff6-4597-95b8-63528da32a02	fff57a40-b3bd-432f-82fc-85eb51f72cb6	65	2026-06-01 15:16:07.912	2026-06-01 15:16:07.912
750e6966-32d0-40be-8a9d-a393a0b15ae4	38788506-c200-4a8d-8f06-00567e1681e9	6e4878d6-33b9-4d0d-a1eb-b800d1ca690e	25	2026-06-01 15:16:07.912	2026-06-01 15:16:07.912
7ca1348b-c3a0-45b1-bf4f-07ee0c2d7c8b	38788506-c200-4a8d-8f06-00567e1681e9	e9a54456-73b9-4ba0-ae7b-fd8bc58d83e1	20	2026-06-01 15:16:07.912	2026-06-01 15:16:07.912
fe1a2fca-e014-4666-9ee2-a6f642803c3d	7262fa73-93dd-4a8f-8552-2928375eea81	c08571a8-9a83-49fb-b545-3a83098b9081	80	2026-06-02 05:58:41.484	2026-06-02 05:58:41.484
51110e98-53dd-43bc-bd39-2ff669556173	80003e02-50ff-41a7-b63b-57effc95f6f2	c08571a8-9a83-49fb-b545-3a83098b9081	80	2026-06-02 06:03:05.674	2026-06-02 06:03:05.674
\.


--
-- Data for Name: TrainingHistory; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."TrainingHistory" (id, "studentId", "bookingSlotId", "reportId", "trainedAt", summary, "createdAt", "updatedAt") FROM stdin;
91387bbd-ca94-4c04-860a-1c9d8ce35e6b	1827d794-aff6-4597-95b8-63528da32a02	5d3c106f-c7c5-480e-b05b-3852a5bd332b	adf7e1eb-ac90-49cf-be6a-3528a8c06916	2026-05-28 15:00:00	Тренировка завершена, отчет сохранен.	2026-06-01 15:16:07.991	2026-06-01 15:23:43.631
7c2a7270-b74d-425a-baf0-53a2323561d5	7262fa73-93dd-4a8f-8552-2928375eea81	01375833-23ca-4604-8bec-8fba28237288	83a29fbe-089d-4286-9a58-5209a56b7083	2026-06-10 10:00:00	Стал плавнее держать траекторию	2026-06-02 05:58:41.612	2026-06-02 05:58:41.612
5044fa1f-9b80-4b31-9d5f-54034f8636e6	7262fa73-93dd-4a8f-8552-2928375eea81	\N	\N	2026-06-01 10:00:00	Ручная запись старой тренировки	2026-06-02 05:58:41.663	2026-06-02 05:58:41.663
f1b87eeb-5653-4019-b407-0008d87e9407	80003e02-50ff-41a7-b63b-57effc95f6f2	b3542d69-9109-4921-9221-c582189ee618	6e074da8-458a-4fcf-b29e-7a276f23be17	2026-06-11 10:00:00	Стал плавнее держать траекторию	2026-06-02 06:03:05.764	2026-06-02 06:03:05.764
cf4a4eb9-e987-480b-b333-73f07dbee5a4	80003e02-50ff-41a7-b63b-57effc95f6f2	\N	\N	2026-06-01 10:00:00	Ручная запись старой тренировки	2026-06-02 06:03:05.808	2026-06-02 06:03:05.808
8a07680b-9b58-4797-a1e9-ae15f014aced	1827d794-aff6-4597-95b8-63528da32a02	\N	\N	2026-06-02 09:00:00	Что тренировали: Овал, Восьмерка\nЧто получилось: ровнее траектория\nНа что обратить внимание: мягче газ	2026-06-02 07:41:36.294	2026-06-02 07:41:36.294
04b00823-ad9b-4dce-8cea-2dccee793ba0	905aae25-b7d8-4fa3-bae2-708950b29ee7	d06dbec9-09bf-4f1c-a6a8-23e76f061cba	590a613d-6c78-48c7-8689-642e82ed29ee	2026-06-26 10:00:00	ok	2026-06-03 11:31:02.516	2026-06-03 11:31:02.516
5c0d00d4-f7c6-4e07-83c2-e7f4f4c2e92d	009df4af-ace7-4022-a62a-a246616e16b3	64c91c56-27fe-4a05-9c97-62c561b1dbcc	5f876dd0-a376-4ac9-9235-2337ec7cd52b	2026-06-26 10:00:00	ok	2026-06-03 11:56:49.219	2026-06-03 11:56:49.219
f872b0f5-e081-45c3-a660-09f015259960	d383e257-b6c1-4c37-94e0-41cac17ddf30	2d281eea-287e-468a-b1bb-49136cfc7274	e82ec418-07bc-45f2-adaf-b3196fcd5865	2026-06-26 10:00:00	ok	2026-06-03 15:54:44.055	2026-06-03 15:54:44.055
7e4b2835-bea9-4e68-a737-6aa791656b78	24de067a-8d7d-4f52-ba85-8e22909e5499	8464d0b2-be60-4c9b-ae90-f7bd86d8e022	3f967197-04df-4895-97ea-557187262022	2026-06-26 10:00:00	ok	2026-06-03 16:27:32.812	2026-06-03 16:27:32.812
\.


--
-- Data for Name: TrainingPackage; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."TrainingPackage" (id, "studentId", title, "totalSessions", "usedSessions", "paymentStatus", status, "purchasedAt", "expiresAt", notes, "createdAt", "updatedAt") FROM stdin;
19c476b9-7ee5-4851-93e4-85957fcfa5aa	1827d794-aff6-4597-95b8-63528da32a02	Пакет 4 тренировки	4	4	paid	completed	2026-05-01 10:00:00	\N	Закрытый пакет. Не связан автоматически с историей.	2026-06-01 15:16:07.95	2026-06-01 15:23:43.609
85c3326a-7a3f-4ec5-9a76-c5ecfc9fd5de	1827d794-aff6-4597-95b8-63528da32a02	Пакет 3 тренировки	3	0	paid	active	2026-05-25 10:00:00	\N	\N	2026-06-01 15:16:07.958	2026-06-01 15:23:43.617
9fcadfad-468f-4938-902b-6ad252bd499e	38788506-c200-4a8d-8f06-00567e1681e9	Пробный пакет	2	0	partial	active	\N	\N	\N	2026-06-01 15:16:07.964	2026-06-01 15:23:43.62
90a59b2b-7b8e-441b-8b68-72b89acf2ee8	7262fa73-93dd-4a8f-8552-2928375eea81	Пакет 5 тренировок	5	1	paid	active	2026-06-02 06:00:00	2026-07-02 06:00:00	\N	2026-06-02 05:58:41.442	2026-06-02 05:58:41.442
e93fccda-98d1-4a85-a134-ace935c1326d	80003e02-50ff-41a7-b63b-57effc95f6f2	Пакет 5 тренировок	5	1	paid	active	2026-06-02 06:00:00	2026-07-02 06:00:00	\N	2026-06-02 06:03:05.636	2026-06-02 06:03:05.636
0dad2f9d-055a-4f4e-ad5a-52c4926b595b	690e7c99-d99e-4f24-aa90-6fd02c3495da	Пакет 7 тренировок	7	0	unpaid	active	\N	\N	\N	2026-06-02 10:58:59.549	2026-06-02 10:58:59.549
\.


--
-- Data for Name: TrainingReport; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."TrainingReport" (id, "bookingSlotId", "studentId", "instructorId", "trainedOn", successes, "focusNext", "levelChange", "createdAt", "updatedAt") FROM stdin;
adf7e1eb-ac90-49cf-be6a-3528a8c06916	5d3c106f-c7c5-480e-b05b-3852a5bd332b	1827d794-aff6-4597-95b8-63528da32a02	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Восьмерка, торможение, взгляд в повороте	Стабильнее держит траекторию и раньше смотрит в выход.	Не зажимать руль на малой скорости, добавить плавности газа.	INTERMEDIATE	2026-06-01 15:16:07.985	2026-06-01 15:23:43.628
83a29fbe-089d-4286-9a58-5209a56b7083	01375833-23ca-4604-8bec-8fba28237288	7262fa73-93dd-4a8f-8552-2928375eea81	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал, Торможение	Стал плавнее держать траекторию	Добавить взгляд в выход	INTERMEDIATE	2026-06-02 05:58:41.607	2026-06-02 05:58:41.607
6e074da8-458a-4fcf-b29e-7a276f23be17	b3542d69-9109-4921-9221-c582189ee618	80003e02-50ff-41a7-b63b-57effc95f6f2	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал, Торможение	Стал плавнее держать траекторию	Добавить взгляд в выход	INTERMEDIATE	2026-06-02 06:03:05.762	2026-06-02 06:03:05.762
590a613d-6c78-48c7-8689-642e82ed29ee	d06dbec9-09bf-4f1c-a6a8-23e76f061cba	905aae25-b7d8-4fa3-bae2-708950b29ee7	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал	ok	next	\N	2026-06-03 11:31:02.515	2026-06-03 11:31:02.515
5f876dd0-a376-4ac9-9235-2337ec7cd52b	64c91c56-27fe-4a05-9c97-62c561b1dbcc	009df4af-ace7-4022-a62a-a246616e16b3	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал	ok	next	\N	2026-06-03 11:56:49.218	2026-06-03 11:56:49.218
e82ec418-07bc-45f2-adaf-b3196fcd5865	2d281eea-287e-468a-b1bb-49136cfc7274	d383e257-b6c1-4c37-94e0-41cac17ddf30	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал	ok	next	\N	2026-06-03 15:54:44.047	2026-06-03 15:54:44.047
3f967197-04df-4895-97ea-557187262022	8464d0b2-be60-4c9b-ae90-f7bd86d8e022	24de067a-8d7d-4f52-ba85-8e22909e5499	8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	Овал	ok	next	\N	2026-06-03 16:27:32.804	2026-06-03 16:27:32.804
\.


--
-- Data for Name: TrainingVideo; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."TrainingVideo" (id, "studentId", "trainingHistoryId", "reportId", "telegramUrl", title, notes, "createdAt", "updatedAt") FROM stdin;
6630eed2-4eda-4750-9979-71f4cab8a223	1827d794-aff6-4597-95b8-63528da32a02	91387bbd-ca94-4c04-860a-1c9d8ce35e6b	adf7e1eb-ac90-49cf-be6a-3528a8c06916	https://t.me/example_video/1	Восьмерка после корректировки взгляда	\N	2026-06-01 15:16:08.004	2026-06-01 15:23:43.635
870e7dc5-4f23-4d1a-bf12-177e3d82f566	7262fa73-93dd-4a8f-8552-2928375eea81	7c2a7270-b74d-425a-baf0-53a2323561d5	83a29fbe-089d-4286-9a58-5209a56b7083	https://t.me/example_video/pass4	Овал после корректировки	видно прогресс	2026-06-02 05:58:41.646	2026-06-02 05:58:41.646
9fc69fa0-f6a7-4026-ad6b-78153228feef	80003e02-50ff-41a7-b63b-57effc95f6f2	f1b87eeb-5653-4019-b407-0008d87e9407	6e074da8-458a-4fcf-b29e-7a276f23be17	https://t.me/example_video/pass4	Овал после корректировки	видно прогресс	2026-06-02 06:03:05.789	2026-06-02 06:03:05.789
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public."User" (id, "telegramId", "telegramUsername", "displayName", role, "createdAt", "updatedAt") FROM stdin;
8e3b8bdc-9863-4f69-9b3d-76ad1ae0bbf8	\N	nikita_instructor	Никита	INSTRUCTOR	2026-06-01 15:16:07.157	2026-06-01 15:16:07.157
f7f46558-12a7-47d6-a178-1c4aaf047a4e	\N	alex_moto	Алексей	STUDENT	2026-06-01 15:16:07.314	2026-06-01 15:16:07.314
83926141-4dd7-4df4-b55c-710699023a6d	\N	maria_rides	Мария	STUDENT	2026-06-01 15:16:07.443	2026-06-01 15:16:07.443
262901ee-ab80-47ca-abc9-21072c8d742b	\N	pass4_1780379921053	Pass4 Test Student	STUDENT	2026-06-02 05:58:41.287	2026-06-02 05:58:41.287
32a416a2-f22d-48dd-afb9-670a053a1c16	\N	postman_write_1780380185	Postman Write Student	STUDENT	2026-06-02 06:03:05.525	2026-06-02 06:03:05.525
3731d8ca-2942-4505-a2fe-5f7d25eefbf6	\N	\N	иии	STUDENT	2026-06-02 10:58:14.989	2026-06-02 10:58:59.476
6ed99503-c829-460b-ae43-264cb550ec94	\N	reschedule_1780403048479	Reschedule Test	STUDENT	2026-06-02 12:24:08.954	2026-06-02 12:24:08.954
cf2be56d-0a87-4f37-b9fb-ba8dc0ead90c	\N	previous_1780483055123	Previous Fields Test	STUDENT	2026-06-03 10:37:35.253	2026-06-03 10:37:35.253
3dbea658-48d7-4ad0-a1c4-a5b7bd34c504	\N	cancel_requested_1780486262241_1830	cancel_requested Student	STUDENT	2026-06-03 11:31:02.317	2026-06-03 11:31:02.317
ef302906-7231-4f2a-865f-97a1b4d03f64	\N	cancel_confirmed_1780486262241_2195	cancel_confirmed Student	STUDENT	2026-06-03 11:31:02.431	2026-06-03 11:31:02.431
17f729d3-eac7-4918-affd-6fe8b6916369	\N	cancel_reschedule_1780486262241_7509	cancel_reschedule Student	STUDENT	2026-06-03 11:31:02.472	2026-06-03 11:31:02.472
81466204-7645-4f0a-b486-b27723e83d4c	\N	cancel_completed_1780486262241_6398	cancel_completed Student	STUDENT	2026-06-03 11:31:02.503	2026-06-03 11:31:02.503
023057a0-265e-4179-98f8-9b4aada6b710	\N	cancel_requested_1780487808897_32346	cancel_requested Student	STUDENT	2026-06-03 11:56:48.985	2026-06-03 11:56:48.985
e195e25f-7cef-4261-8081-9f70265bd48f	\N	cancel_confirmed_1780487808897_44581	cancel_confirmed Student	STUDENT	2026-06-03 11:56:49.082	2026-06-03 11:56:49.082
44b2f1f3-0702-4885-a20b-537b02d80466	\N	cancel_reschedule_1780487808897_4719	cancel_reschedule Student	STUDENT	2026-06-03 11:56:49.14	2026-06-03 11:56:49.14
7d56ef7c-ea30-4c35-a13f-5fc6b886a78a	\N	cancel_completed_1780487808897_63754	cancel_completed Student	STUDENT	2026-06-03 11:56:49.188	2026-06-03 11:56:49.188
c93757a8-3b35-4a25-b1b8-cb02a30180dd	\N	new_reschedule_1780501863623	Reschedule New Flow	STUDENT	2026-06-03 15:51:03.891	2026-06-03 15:51:03.891
40d33190-6304-4423-9ab9-9bc25fe3a1f7	\N	cancel_requested_1780502082806_26574	cancel_requested Student	STUDENT	2026-06-03 15:54:42.941	2026-06-03 15:54:42.941
0f22fc3a-d1bf-4309-9500-5795aea901fe	\N	cancel_confirmed_1780502082806_39702	cancel_confirmed Student	STUDENT	2026-06-03 15:54:43.498	2026-06-03 15:54:43.498
321621d9-50ca-4b29-94d0-bd6d35c309b2	\N	cancel_reschedule_1780502082806_2148	cancel_reschedule Student	STUDENT	2026-06-03 15:54:43.684	2026-06-03 15:54:43.684
343559b6-1893-48ff-93d9-1238e068ccfd	\N	cancel_completed_1780502082806_79388	cancel_completed Student	STUDENT	2026-06-03 15:54:43.933	2026-06-03 15:54:43.933
90246eba-dce1-4b0b-a566-7362d7638050	\N	rollback_1780503782562_2789	rollback Student	STUDENT	2026-06-03 16:23:03.328	2026-06-03 16:23:03.328
6bd02805-cf2a-49ad-9c3b-dfbd2c452467	\N	cancel_requested_1780504050087_51741	cancel_requested Student	STUDENT	2026-06-03 16:27:30.187	2026-06-03 16:27:30.187
4ab113f8-911b-4cac-a1b7-962df3d0db4b	\N	cancel_confirmed_1780504050087_76665	cancel_confirmed Student	STUDENT	2026-06-03 16:27:30.31	2026-06-03 16:27:30.31
6fb4d5a6-a58f-4459-905f-5fe45458c7dd	\N	cancel_reschedule_1780504050087_14291	cancel_reschedule Student	STUDENT	2026-06-03 16:27:32.149	2026-06-03 16:27:32.149
3179fbdf-26e1-4854-8db2-9c9b7343e5c9	\N	cancel_completed_1780504050087_52590	cancel_completed Student	STUDENT	2026-06-03 16:27:32.684	2026-06-03 16:27:32.684
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: moto
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c4e93e5d-b872-45b1-8f66-85b651629c76	a3bbc8bff1449fa919f370af5310035e647584f6f53fe8804907400cb8802023	2026-06-01 15:07:44.296654+00	20260601000000_initial_foundation	\N	\N	2026-06-01 15:07:44.232801+00	1
8089ee61-8182-4177-bd04-fb7b27fe353a	8e6d0b27cda804de0f44a5656187d407761dc416449df91aff8af4d86d973ee2	2026-06-02 05:57:13.08731+00	20260602000000_write_endpoints_foundation	\N	\N	2026-06-02 05:57:13.076368+00	1
aadffea6-6ad2-4c30-87e0-e8d5ca6e6f7c	7a48e6b6bf0ff8b5c48a082554304f02b9b20d74546db009c979c77bb1550d8e	2026-06-02 12:21:43.787556+00	20260602010000_add_reschedule_booking_slot_status	\N	\N	2026-06-02 12:21:43.73791+00	1
024ab603-748e-442f-92c6-2c4ee184de07	6b7602290ee968866724d44f7065f0d83c27b0fe1014047b2a6cabdf4a263049	2026-06-03 10:36:11.311558+00	20260603000000_add_previous_reschedule_fields	\N	\N	2026-06-03 10:36:11.302237+00	1
72bc97e0-51a1-4dd0-accd-9c78f4594abe	c3b08bdd7b4e61a454d1d122cb77c43312b450ae9abb98c287586b1c1e1d880f	2026-06-03 15:49:15.903121+00	20260603010000_reschedule_target_slot_flow	\N	\N	2026-06-03 15:49:15.883589+00	1
3f182d26-8663-4a39-8ee2-33acf41fa6cf	96ff94468ab47fa109280243b77546e9f6dc8cb4ed99102294b826d0e9a4add1	2026-06-03 16:13:35.50563+00	20260603020000_revert_reschedule_target_slot_flow	\N	\N	2026-06-03 16:13:35.49309+00	1
\.


--
-- Name: BookingSlot BookingSlot_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."BookingSlot"
    ADD CONSTRAINT "BookingSlot_pkey" PRIMARY KEY (id);


--
-- Name: CalendarSyncEvent CalendarSyncEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."CalendarSyncEvent"
    ADD CONSTRAINT "CalendarSyncEvent_pkey" PRIMARY KEY (id);


--
-- Name: Skill Skill_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_pkey" PRIMARY KEY (id);


--
-- Name: StudentSkill StudentSkill_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."StudentSkill"
    ADD CONSTRAINT "StudentSkill_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: TrainingHistory TrainingHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingHistory"
    ADD CONSTRAINT "TrainingHistory_pkey" PRIMARY KEY (id);


--
-- Name: TrainingPackage TrainingPackage_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingPackage"
    ADD CONSTRAINT "TrainingPackage_pkey" PRIMARY KEY (id);


--
-- Name: TrainingReport TrainingReport_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingReport"
    ADD CONSTRAINT "TrainingReport_pkey" PRIMARY KEY (id);


--
-- Name: TrainingVideo TrainingVideo_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingVideo"
    ADD CONSTRAINT "TrainingVideo_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: BookingSlot_startsAt_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "BookingSlot_startsAt_idx" ON public."BookingSlot" USING btree ("startsAt");


--
-- Name: BookingSlot_status_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "BookingSlot_status_idx" ON public."BookingSlot" USING btree (status);


--
-- Name: BookingSlot_studentId_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "BookingSlot_studentId_idx" ON public."BookingSlot" USING btree ("studentId");


--
-- Name: CalendarSyncEvent_provider_externalEventId_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "CalendarSyncEvent_provider_externalEventId_idx" ON public."CalendarSyncEvent" USING btree (provider, "externalEventId");


--
-- Name: Skill_name_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "Skill_name_key" ON public."Skill" USING btree (name);


--
-- Name: StudentSkill_studentId_skillId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "StudentSkill_studentId_skillId_key" ON public."StudentSkill" USING btree ("studentId", "skillId");


--
-- Name: Student_userId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "Student_userId_key" ON public."Student" USING btree ("userId");


--
-- Name: TrainingHistory_bookingSlotId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "TrainingHistory_bookingSlotId_key" ON public."TrainingHistory" USING btree ("bookingSlotId");


--
-- Name: TrainingHistory_reportId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "TrainingHistory_reportId_key" ON public."TrainingHistory" USING btree ("reportId");


--
-- Name: TrainingHistory_studentId_trainedAt_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "TrainingHistory_studentId_trainedAt_idx" ON public."TrainingHistory" USING btree ("studentId", "trainedAt");


--
-- Name: TrainingPackage_studentId_status_idx; Type: INDEX; Schema: public; Owner: moto
--

CREATE INDEX "TrainingPackage_studentId_status_idx" ON public."TrainingPackage" USING btree ("studentId", status);


--
-- Name: TrainingReport_bookingSlotId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "TrainingReport_bookingSlotId_key" ON public."TrainingReport" USING btree ("bookingSlotId");


--
-- Name: User_telegramId_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "User_telegramId_key" ON public."User" USING btree ("telegramId");


--
-- Name: User_telegramUsername_key; Type: INDEX; Schema: public; Owner: moto
--

CREATE UNIQUE INDEX "User_telegramUsername_key" ON public."User" USING btree ("telegramUsername");


--
-- Name: BookingSlot BookingSlot_instructorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."BookingSlot"
    ADD CONSTRAINT "BookingSlot_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BookingSlot BookingSlot_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."BookingSlot"
    ADD CONSTRAINT "BookingSlot_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BookingSlot BookingSlot_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."BookingSlot"
    ADD CONSTRAINT "BookingSlot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CalendarSyncEvent CalendarSyncEvent_bookingSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."CalendarSyncEvent"
    ADD CONSTRAINT "CalendarSyncEvent_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES public."BookingSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CalendarSyncEvent CalendarSyncEvent_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."CalendarSyncEvent"
    ADD CONSTRAINT "CalendarSyncEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StudentSkill StudentSkill_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."StudentSkill"
    ADD CONSTRAINT "StudentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentSkill StudentSkill_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."StudentSkill"
    ADD CONSTRAINT "StudentSkill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingHistory TrainingHistory_bookingSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingHistory"
    ADD CONSTRAINT "TrainingHistory_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES public."BookingSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingHistory TrainingHistory_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingHistory"
    ADD CONSTRAINT "TrainingHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public."TrainingReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingHistory TrainingHistory_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingHistory"
    ADD CONSTRAINT "TrainingHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingPackage TrainingPackage_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingPackage"
    ADD CONSTRAINT "TrainingPackage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingReport TrainingReport_bookingSlotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingReport"
    ADD CONSTRAINT "TrainingReport_bookingSlotId_fkey" FOREIGN KEY ("bookingSlotId") REFERENCES public."BookingSlot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingReport TrainingReport_instructorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingReport"
    ADD CONSTRAINT "TrainingReport_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TrainingReport TrainingReport_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingReport"
    ADD CONSTRAINT "TrainingReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingVideo TrainingVideo_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingVideo"
    ADD CONSTRAINT "TrainingVideo_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public."TrainingReport"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TrainingVideo TrainingVideo_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingVideo"
    ADD CONSTRAINT "TrainingVideo_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TrainingVideo TrainingVideo_trainingHistoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: moto
--

ALTER TABLE ONLY public."TrainingVideo"
    ADD CONSTRAINT "TrainingVideo_trainingHistoryId_fkey" FOREIGN KEY ("trainingHistoryId") REFERENCES public."TrainingHistory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict Opvjuunfn8VDED6q049V0M5X7H96OABPf3sL9r8S0ah3OSbhXwcceWRvAEUdaHR

