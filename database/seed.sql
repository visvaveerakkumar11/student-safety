-- =====================================================================
-- Starter data for the Child Safety Verification System.
-- Run AFTER schema.sql, or on its own to reset the data: it empties every
-- table except admins (your login is kept), then adds 2 buses and
-- 4 students whose parent alerts all go to the same mobile number.
--
-- No admin account is seeded: the backend creates the first admin from
-- the ADMIN_EMAIL / ADMIN_PASSWORD environment variables on startup.
-- =====================================================================

begin;

truncate table notifications, scan_events, bus_assignments, rfid_cards, students, buses restart identity;

insert into buses (bus_number, registration_number, driver_name, driver_phone, route_name, capacity, status) values
  ('BUS-01', 'TN 09 BX 4521', 'Rajesh Kumar', '+91 98401 22314', 'Anna Nagar - Kilpauk', 20, 'ACTIVE'),
  ('BUS-02', 'TN 09 BY 7810', 'Suresh Babu',  '+91 98843 51290', 'T. Nagar - Saidapet',  16, 'ACTIVE');

create temporary table seed_students (
  admission_number text, full_name text, class_name text, section text,
  parent_name text, parent_phone text, card_uid text, bus_number text
) on commit drop;

insert into seed_students values
  ('ADM-2024-001', 'Aarav Sharma',  'Grade 5', 'A', 'Vikram Sharma',    '+91 70107 47232', '04A31F6B', 'BUS-01'),
  ('ADM-2024-002', 'Diya Krishnan', 'Grade 3', 'B', 'Lakshmi Krishnan', '+91 70107 47232', '04B72C19', 'BUS-01'),
  ('ADM-2024-003', 'Vihaan Reddy',  'Grade 7', 'A', 'Srinivas Reddy',   '+91 70107 47232', '04C4D832', 'BUS-02'),
  ('ADM-2024-004', 'Ananya Iyer',   'Grade 2', 'C', 'Meera Iyer',       '+91 70107 47232', '04D19A4E', 'BUS-02');

insert into students (admission_number, full_name, class_name, section, parent_name, parent_phone)
select admission_number, full_name, class_name, section, parent_name, parent_phone
from seed_students;

insert into rfid_cards (uid, student_id, status)
select ss.card_uid, s.id, 'ACTIVE'
from seed_students ss join students s using (admission_number);

insert into bus_assignments (student_id, bus_id)
select s.id, b.id
from seed_students ss
join students s using (admission_number)
join buses b on b.bus_number = ss.bus_number;

commit;
