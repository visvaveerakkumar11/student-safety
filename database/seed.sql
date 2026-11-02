-- =====================================================================
-- Demo data for the Child Safety Verification System.
-- Run AFTER schema.sql. Re-running schema.sql + seed.sql resets the demo.
--
-- Generates: 6 buses, 40 students with RFID cards, ~4 weeks of school-day
-- trips (Mon-Sat, 4 scans per student per day), a sprinkle of rejected
-- scans, simulated parent notifications, and a live "today" state where
-- BUS-01 and BUS-02 currently have students onboard.
-- Times are generated in Asia/Kolkata and stored as timestamptz.
--
-- No admin account is seeded: the backend creates the first admin from
-- the ADMIN_EMAIL / ADMIN_PASSWORD environment variables on startup.
-- =====================================================================

select setseed(0.42);

drop table if exists seed_students;
drop table if exists seed_riders;

insert into buses (bus_number, registration_number, driver_name, driver_phone, route_name, capacity, status) values
  ('BUS-01', 'TN 09 BX 4521', 'Rajesh Kumar',     '+91 98401 22314', 'Anna Nagar - Kilpauk',        20, 'ACTIVE'),
  ('BUS-02', 'TN 09 BY 7810', 'Suresh Babu',      '+91 98843 51290', 'T. Nagar - Saidapet',         16, 'ACTIVE'),
  ('BUS-03', 'TN 10 AC 3307', 'Murugan Selvam',   '+91 94440 67125', 'Velachery - Adyar',           24, 'ACTIVE'),
  ('BUS-04', 'TN 10 AD 9164', 'Prakash Natarajan','+91 99620 18843', 'Tambaram - Chromepet',        12, 'ACTIVE'),
  ('BUS-05', 'TN 22 CK 2058', 'Venkatesh Iyer',   '+91 97910 44782', 'Porur - Valasaravakkam',      20, 'ACTIVE'),
  ('BUS-06', 'TN 22 CL 6612', 'Arun Prasad',      '+91 90031 77561', 'Ambattur - Mogappair',        30, 'MAINTENANCE');

create temporary table seed_students (
  admission_number text, full_name text, class_name text, section text,
  parent_name text, parent_phone text, card_uid text, bus_number text
);

insert into seed_students values
  ('ADM-2024-001', 'Aarav Sharma',        'Grade 5',  'A', 'Vikram Sharma',        '+91 98400 11201', '04A31F6B', 'BUS-01'),
  ('ADM-2024-002', 'Diya Krishnan',       'Grade 3',  'B', 'Lakshmi Krishnan',     '+91 98400 11202', '04B72C19', 'BUS-01'),
  ('ADM-2024-003', 'Vihaan Reddy',        'Grade 7',  'A', 'Srinivas Reddy',       '+91 98400 11203', '04C4D832', 'BUS-01'),
  ('ADM-2024-004', 'Ananya Iyer',         'Grade 2',  'C', 'Meera Iyer',           '+91 98400 11204', '04D19A4E', 'BUS-01'),
  ('ADM-2024-005', 'Arjun Nair',          'Grade 9',  'B', 'Ramesh Nair',          '+91 98400 11205', '04E58B71', 'BUS-01'),
  ('ADM-2024-006', 'Ishita Menon',        'Grade 4',  'A', 'Kavya Menon',          '+91 98400 11206', '04F2E6A0', 'BUS-01'),
  ('ADM-2024-007', 'Kabir Gupta',         'Grade 6',  'C', 'Anil Gupta',           '+91 98400 11207', '0513B7C4', 'BUS-01'),
  ('ADM-2024-008', 'Saanvi Pillai',       'Grade 1',  'A', 'Divya Pillai',         '+91 98400 11208', '0524A9D5', 'BUS-01'),
  ('ADM-2024-009', 'Reyansh Joshi',       'Grade 8',  'A', 'Manoj Joshi',          '+91 98400 11209', '05358CE6', 'BUS-01'),
  ('ADM-2024-010', 'Myra Subramanian',    'Grade 5',  'B', 'Priya Subramanian',    '+91 98400 11210', '05467DF7', 'BUS-02'),
  ('ADM-2024-011', 'Advik Rao',           'Grade 10', 'A', 'Harish Rao',           '+91 98400 11211', '05576E08', 'BUS-02'),
  ('ADM-2024-012', 'Aadhya Venkatesh',    'Grade 3',  'A', 'Sangeetha Venkatesh',  '+91 98400 11212', '05685F19', 'BUS-02'),
  ('ADM-2024-013', 'Vivaan Mehta',        'Grade 6',  'B', 'Rohit Mehta',          '+91 98400 11213', '0579402A', 'BUS-02'),
  ('ADM-2024-014', 'Kiara Balaji',        'Grade 2',  'A', 'Deepa Balaji',         '+91 98400 11214', '058A313B', 'BUS-02'),
  ('ADM-2024-015', 'Shaurya Patel',       'Grade 9',  'A', 'Nikhil Patel',         '+91 98400 11215', '059B224C', 'BUS-02'),
  ('ADM-2024-016', 'Navya Raghavan',      'Grade 4',  'C', 'Anitha Raghavan',      '+91 98400 11216', '05AC135D', 'BUS-02'),
  ('ADM-2024-017', 'Atharv Kulkarni',     'Grade 7',  'B', 'Sachin Kulkarni',      '+91 98400 11217', '05BD046E', 'BUS-02'),
  ('ADM-2024-018', 'Pari Chandrasekhar',  'Grade 1',  'B', 'Revathi Chandrasekhar','+91 98400 11218', '06C1F57F', 'BUS-03'),
  ('ADM-2024-019', 'Dhruv Srinivasan',    'Grade 8',  'B', 'Karthik Srinivasan',   '+91 98400 11219', '06D2E680', 'BUS-03'),
  ('ADM-2024-020', 'Anika Ramesh',        'Grade 5',  'C', 'Shalini Ramesh',       '+91 98400 11220', '06E3D791', 'BUS-03'),
  ('ADM-2024-021', 'Rudra Bhat',          'Grade 10', 'B', 'Ganesh Bhat',          '+91 98400 11221', '06F4C8A2', 'BUS-03'),
  ('ADM-2024-022', 'Tara Ganesan',        'Grade 3',  'C', 'Uma Ganesan',          '+91 98400 11222', '0705B9B3', 'BUS-03'),
  ('ADM-2024-023', 'Ayaan Khan',          'Grade 6',  'A', 'Imran Khan',           '+91 98400 11223', '0716AAC4', 'BUS-03'),
  ('ADM-2024-024', 'Riya Mohan',          'Grade 2',  'B', 'Sowmya Mohan',         '+91 98400 11224', '07279BD5', 'BUS-03'),
  ('ADM-2024-025', 'Krishna Sundaram',    'Grade 9',  'C', 'Balaji Sundaram',      '+91 98400 11225', '07388CE6', 'BUS-03'),
  ('ADM-2024-026', 'Meher Anand',         'Grade 4',  'B', 'Pooja Anand',          '+91 98400 11226', '07497DF7', 'BUS-03'),
  ('ADM-2024-027', 'Yuvan Shankar',       'Grade 7',  'C', 'Shankar Raman',        '+91 98400 11227', '085A6E08', 'BUS-04'),
  ('ADM-2024-028', 'Avni Jain',           'Grade 1',  'C', 'Neha Jain',            '+91 98400 11228', '086B5F19', 'BUS-04'),
  ('ADM-2024-029', 'Ishaan Das',          'Grade 8',  'C', 'Sourav Das',           '+91 98400 11229', '087C502A', 'BUS-04'),
  ('ADM-2024-030', 'Siya Varghese',       'Grade 5',  'A', 'Annie Varghese',       '+91 98400 11230', '088D413B', 'BUS-04'),
  ('ADM-2024-031', 'Aditya Hegde',        'Grade 10', 'C', 'Prashanth Hegde',      '+91 98400 11231', '089E324C', 'BUS-04'),
  ('ADM-2024-032', 'Zara Thomas',         'Grade 3',  'A', 'Jessy Thomas',         '+91 98400 11232', '08AF235D', 'BUS-04'),
  ('ADM-2024-033', 'Lakshay Agarwal',     'Grade 6',  'B', 'Rahul Agarwal',        '+91 98400 11233', '08B0146E', 'BUS-04'),
  ('ADM-2024-034', 'Prisha Kannan',       'Grade 2',  'A', 'Gayathri Kannan',      '+91 98400 11234', '09C1057F', 'BUS-05'),
  ('ADM-2024-035', 'Arnav Saxena',        'Grade 9',  'B', 'Amit Saxena',          '+91 98400 11235', '09D2F680', 'BUS-05'),
  ('ADM-2024-036', 'Nitya Rajan',         'Grade 4',  'A', 'Bhavani Rajan',        '+91 98400 11236', '09E3E791', 'BUS-05'),
  ('ADM-2024-037', 'Om Prakash',          'Grade 7',  'A', 'Jaya Prakash',         '+91 98400 11237', '09F4D8A2', 'BUS-05'),
  ('ADM-2024-038', 'Sara Fernandes',      'Grade 1',  'A', 'Maria Fernandes',      '+91 98400 11238', '0A05C9B3', 'BUS-05'),
  ('ADM-2024-039', 'Veer Malhotra',       'Grade 8',  'A', 'Sanjay Malhotra',      '+91 98400 11239', '0A16BAC4', null),
  ('ADM-2024-040', 'Anvi Deshpande',      'Grade 6',  'C', 'Swati Deshpande',      '+91 98400 11240', '0A27ABD5', null);

insert into students (admission_number, full_name, class_name, section, parent_name, parent_phone, created_at, updated_at)
select admission_number, full_name, class_name, section, parent_name, parent_phone,
       now() - interval '60 days', now() - interval '60 days'
from seed_students;

insert into rfid_cards (uid, student_id, status, issued_at, updated_at)
select ss.card_uid, s.id, 'ACTIVE', now() - interval '60 days', now() - interval '60 days'
from seed_students ss join students s using (admission_number);

-- Spare, unassigned card (useful to demo "inactive card" rejections).
insert into rfid_cards (uid, student_id, status) values ('0BEEF001', null, 'INACTIVE');

insert into bus_assignments (student_id, bus_id, assigned_at)
select s.id, b.id, now() - interval '60 days'
from seed_students ss
join students s using (admission_number)
join buses b on b.bus_number = ss.bus_number;

-- ---------------------------------------------------------------------
-- Historical trips: last 4 weeks, Monday-Saturday, ~93% attendance.
-- ---------------------------------------------------------------------
create temporary table seed_riders as
select s.id as student_id, s.full_name, b.id as bus_id, b.bus_number, c.uid,
       row_number() over (partition by b.id order by s.id)::int as seat
from students s
join bus_assignments a on a.student_id = s.id
join buses b on b.id = a.bus_id
join rfid_cards c on c.student_id = s.id
where b.status = 'ACTIVE';

with attendance as materialized (
  select r.*, d.day
  from seed_riders r
  cross join (
    select g::date as day
    from generate_series(current_date - 28, current_date - 1, interval '1 day') g
    where extract(isodow from g) < 7
  ) d
  where random() < 0.93                    -- decided once per student per day
)
insert into scan_events (rfid_uid, student_id, bus_id, student_name, bus_number, event_type, result, message, source, scanned_at)
select a.uid, a.student_id, a.bus_id, a.full_name, a.bus_number, t.event_type, 'ACCEPTED',
       case t.event_type when 'BOARDING' then 'Boarding verified for ' else 'Exit verified for ' end
         || a.full_name || ' on ' || a.bus_number,
       'READER',
       ((a.day + t.base) at time zone 'Asia/Kolkata')
         + make_interval(mins => a.seat * 2 + floor(random() * t.spread)::int, secs => floor(random() * 60))
from attendance a
cross join (values
  ('BOARDING', time '07:05', 25),
  ('EXIT',     time '08:10', 15),
  ('BOARDING', time '15:35', 10),
  ('EXIT',     time '16:05', 40)
) t(event_type, base, spread)
order by 10;

-- ---------------------------------------------------------------------
-- Today (relative to now): BUS-01 and BUS-02 are on route with students
-- onboard; BUS-03 completed its trip; BUS-04 / BUS-05 have not started.
-- ---------------------------------------------------------------------
insert into scan_events (rfid_uid, student_id, bus_id, student_name, bus_number, event_type, result, message, source, scanned_at)
select r.uid, r.student_id, r.bus_id, r.full_name, r.bus_number, 'BOARDING', 'ACCEPTED',
       'Boarding verified for ' || r.full_name || ' on ' || r.bus_number, 'READER',
       now() - make_interval(mins => 75 - r.seat * 2, secs => floor(random() * 50))
from seed_riders r
where r.bus_number in ('BUS-01', 'BUS-02', 'BUS-03')
  and r.seat <> 4;                         -- one absentee per bus

insert into scan_events (rfid_uid, student_id, bus_id, student_name, bus_number, event_type, result, message, source, scanned_at)
select r.uid, r.student_id, r.bus_id, r.full_name, r.bus_number, 'EXIT', 'ACCEPTED',
       'Exit verified for ' || r.full_name || ' on ' || r.bus_number, 'READER',
       now() - make_interval(mins => 30 - r.seat * 2, secs => floor(random() * 50))
from seed_riders r
where r.seat <> 4
  and (r.bus_number = 'BUS-03' or (r.bus_number = 'BUS-01' and r.seat <= 3));

-- ---------------------------------------------------------------------
-- Rejected scans (history + today) for verification-failure analytics.
-- ---------------------------------------------------------------------
-- Duplicate taps a few seconds after an accepted scan.
insert into scan_events (rfid_uid, student_id, bus_id, student_name, bus_number, event_type, result, rejection_reason, message, source, scanned_at)
select e.rfid_uid, e.student_id, e.bus_id, e.student_name, e.bus_number, e.event_type, 'REJECTED', 'DUPLICATE_SCAN',
       'Duplicate scan ignored for ' || e.student_name || ' (card tapped again within the protection window)', 'READER',
       e.scanned_at + make_interval(secs => 3 + floor(random() * 5))
from scan_events e
where e.result = 'ACCEPTED' and random() < 0.012 + 0 * e.id;

-- Students tapping on the wrong bus.
insert into scan_events (rfid_uid, student_id, bus_id, student_name, bus_number, event_type, result, rejection_reason, message, source, scanned_at)
select e.rfid_uid, e.student_id, wrong.id, e.student_name, wrong.bus_number, 'BOARDING', 'REJECTED', 'UNAUTHORIZED_BUS',
       e.student_name || ' is not assigned to ' || wrong.bus_number, 'READER',
       e.scanned_at - interval '2 minutes'
from scan_events e
join buses wrong on wrong.bus_number = case e.bus_number when 'BUS-01' then 'BUS-02' when 'BUS-02' then 'BUS-03'
                                                         when 'BUS-03' then 'BUS-04' when 'BUS-04' then 'BUS-05' else 'BUS-01' end
where e.result = 'ACCEPTED' and e.event_type = 'BOARDING' and random() < 0.006 + 0 * e.id;

-- Unknown / unregistered cards.
insert into scan_events (rfid_uid, bus_id, bus_number, event_type, result, rejection_reason, message, source, scanned_at)
select upper(substr(md5(g::text), 1, 8)), b.id, b.bus_number, 'BOARDING', 'REJECTED', 'UNKNOWN_CARD',
       'Card ' || upper(substr(md5(g::text), 1, 8)) || ' is not registered', 'READER',
       (((current_date - (g % 27) - 1) + time '07:20') at time zone 'Asia/Kolkata') + make_interval(mins => g % 30)
from generate_series(1, 14) g
join buses b on b.bus_number = 'BUS-0' || (1 + g % 5);

-- Deactivated card attempt and a couple of live rejections today.
insert into scan_events (rfid_uid, bus_id, bus_number, event_type, result, rejection_reason, message, source, scanned_at)
select '0BEEF001', id, bus_number, 'BOARDING', 'REJECTED', 'CARD_INACTIVE',
       'Card 0BEEF001 is deactivated', 'READER', now() - interval '3 days 6 hours'
from buses where bus_number = 'BUS-02';

insert into scan_events (rfid_uid, bus_id, bus_number, event_type, result, rejection_reason, message, source, scanned_at)
select 'DEADBEEF', id, bus_number, 'BOARDING', 'REJECTED', 'UNKNOWN_CARD',
       'Card DEADBEEF is not registered', 'SIMULATOR', now() - interval '64 minutes'
from buses where bus_number = 'BUS-01';

-- ---------------------------------------------------------------------
-- Current transport status = latest accepted scan per student.
-- ---------------------------------------------------------------------
update students s
set transport_status = case l.event_type when 'BOARDING' then 'ONBOARD' else 'EXITED' end,
    last_scan_at     = l.scanned_at
from (
  select distinct on (student_id) student_id, event_type, scanned_at
  from scan_events
  where result = 'ACCEPTED'
  order by student_id, scanned_at desc
) l
where l.student_id = s.id;

-- ---------------------------------------------------------------------
-- Simulated parent notifications for every accepted scan.
-- ---------------------------------------------------------------------
insert into notifications (scan_event_id, student_id, student_name, bus_number, recipient_name, recipient_phone,
                           event_type, message, status, provider, simulated, provider_message_id, failure_reason,
                           attempts, created_at, sent_at, delivered_at, updated_at)
select e.id, s.id, e.student_name, e.bus_number, s.parent_name, s.parent_phone, e.event_type,
       'Dear Parent, your child ' || e.student_name
         || case e.event_type when 'BOARDING' then ' has successfully boarded school bus ' else ' has exited school bus ' end
         || e.bus_number || ' at ' || to_char(e.scanned_at at time zone 'Asia/Kolkata', 'HH12:MI AM') || '.',
       x.status, 'SIMULATED', true,
       'SIM-' || upper(substr(md5(e.id::text), 1, 12)),
       case when x.status = 'FAILED' then 'Simulated delivery failure: handset unreachable' end,
       1,
       e.scanned_at,
       e.scanned_at + interval '2 seconds',
       case when x.status = 'DELIVERED' then e.scanned_at + interval '6 seconds' end,
       e.scanned_at + interval '6 seconds'
from scan_events e
join students s on s.id = e.student_id
cross join lateral (
  select case when q.r < 0.035 then 'FAILED' when q.r < 0.05 then 'SENT' else 'DELIVERED' end as status
  from (select random() + 0 * e.id as r) q
) x
where e.result = 'ACCEPTED';

drop table if exists seed_students;
drop table if exists seed_riders;

-- Quick sanity summary.
select
  (select count(*) from buses)                                   as buses,
  (select count(*) from students)                                as students,
  (select count(*) from students where transport_status = 'ONBOARD') as onboard_now,
  (select count(*) from scan_events)                             as scan_events,
  (select count(*) from scan_events where result = 'REJECTED')   as rejected_scans,
  (select count(*) from notifications)                           as notifications;
