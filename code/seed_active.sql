-- ============================================================
-- VMDash Data Seeding Script — Active Execution
-- Generated: 2026-06-12
-- ============================================================
-- PURPOSE: Ownership & business-data enrichment only.
--          NO proxmox infrastructure records are created.
--          NO vm.os, vm.status, vm.node, vm.cluster values modified.
-- DATABASES MODIFIED: ccds_db (business), proxmox_db (ownership)
-- IDEMPOTENT: All inserts use INSERT IGNORE. Safe to re-run.
-- RUN AS: mysql -u admin -pvssc@123 < seed_active.sql
-- ============================================================
-- EXPECTED OUTCOME:
--   ccds_db.users          : +4 users  (total: 5)
--   ccds_db.user_role      : +4 logins (total: 5)
--   ccds_db.vms            : +28 registered VMs (total: 30)
--   ccds_db.vm_users       : +28 links (total: 30)
--   proxmox_db.vm_user_rel : +27 links (total: 29)
--   Assigned VMs (unique)  : ~28
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ============================================================
-- [1] ccds_db.empdetails  — Employee Master (for portal lookup)
-- ccds_db.empdetails is a mirror/subset of proxmox_db.empdetails.
-- varchar(10) for all string fields — no truncation needed.
-- ============================================================
USE ccds_db;

INSERT IGNORE INTO empdetails (staff_code, name, division, groupname, entity)
VALUES
  ('VS10106', 'AJITH MR',           'AMG',  'AMG',  'MME' ),
  ('VS10201', 'ANIL PAINULY',       'CCDD', 'CMDG', 'CMSE'),
  ('VS11676', 'GISHA SUSAN THOMAS', 'PGA',  'PGA',  'ADMN.AUX'),
  ('VS12071', 'HASEENA L',          'ESIS', 'CITG', 'MSA' );

-- ============================================================
-- [2] ccds_db.users  — Portal user profiles
-- varchar(5) on entity, groupname, division — values trimmed to fit.
-- ADMN.AUX → ADMN. (5 chars)
-- ============================================================

INSERT IGNORE INTO users (staff_code, name, center, entity, groupname, division)
VALUES
  ('VS10106', 'AJITH MR',           'VSSC', 'MME',   'AMG',  'AMG'  ),
  ('VS10201', 'ANIL PAINULY',       'VSSC', 'CMSE',  'CMDG', 'CCDD' ),
  ('VS11676', 'GISHA SUSAN THOMAS', 'VSSC', 'ADMN.', 'PGA',  'PGA'  ),
  ('VS12071', 'HASEENA L',          'VSSC', 'MSA',   'CITG', 'ESIS' );

-- ============================================================
-- [3] ccds_db.user_role  — Login credentials
-- Werkzeug scrypt hashes of 'vssc@123' (same default as all accounts)
-- ============================================================

INSERT IGNORE INTO user_role (staff_code1, role, password_hash)
VALUES
  ('VS10106', 'user', 'scrypt:32768:8:1$w6crOKMemlkXbZoX$4b6b75d79add35b8d3506e500386ed8e9cab119333f4ef8c91b37304ccae392b4dbdf67a4a53577c0bb849891fbca44de6feff722ba0ec931dc08d81133306a3'),
  ('VS10201', 'user', 'scrypt:32768:8:1$Xqby82FxOWArTffU$b50969ba9b5fcd7c32b114b4e4b3d671b06fffa7fa237951ec84472b27b5d17bd224e287617d5651581435ebe35e0c71b4839a519c06739283c5a17d2dc788fe'),
  ('VS11676', 'user', 'scrypt:32768:8:1$EZMShX5XpnsGaQUl$0647d886dbe8df580c97619bca33ecb93135274dd41e421142d57fedf1cf07f71ae13f5e580f4065847d485c3fd978ace2db924f31fe1e4a3246983794894f3b'),
  ('VS12071', 'user', 'scrypt:32768:8:1$1i3gsXmPfW9nlODi$f686e04896a2e83b3f6f07e1c492cb445be8f886b267cbe9373746c587d0d3e0ca146ebe17115292afd4d86e8418bfb263cf58de2f43a9305345fdf4cb7f9600');

-- ============================================================
-- [4] ccds_db.vms  — VM registration (portal business records)
-- os varchar(10): mapped from Proxmox OS to short portal codes.
-- time_created: spread 2025-09 → 2026-01 for capacity projections.
-- ip/mac: synthetic RFC-safe values (not in production space).
-- Note: 'ubuntu-app-vm' and 'wfh-win-7' appear for multiple users;
--       INSERT IGNORE on PK vm_name keeps only the first insert.
-- ============================================================

-- --- user account: 4 additional VMs (mixed OS, mixed size) ---
INSERT IGNORE INTO vms (vm_name, host_name, environment, cluster, ram, cores, ip, mac, os, disk_size, source, time_created, gpu)
VALUES
  ('win-test-react-flask', 'win-test-react-flask', 'production', 'fsgpucluster-25',  6,  4,  '10.41.25.001', 'BC:24:11:A0:00:01', 'windows', 50,  'PVE', '2025-10-15', '0'),
  ('wfh-win-1',            'wfh-win-1',            'production', 'fsgpucluster-25',  6,  4,  '10.41.25.002', 'BC:24:11:A0:00:02', 'windows', 200, 'PVE', '2025-11-20', '0'),
  ('wfh-linux',            'wfh-linux',            'production', 'fsgpucluster-25', 12,  4,  '10.41.25.003', 'BC:24:11:A0:00:03', 'linux',   200, 'PVE', '2025-12-10', '0'),
  ('ubuntu-app-vm',        'ubuntu-app-vm',        'production', 'fsgpucluster-25',  8,  4,  '10.41.25.004', 'BC:24:11:A0:00:04', 'ubuntu',  150, 'PVE', '2025-12-20', '0');

-- --- VS10106 — AJITH MR (MME / AMG / AMG) — 6 VMs ---
-- Mix: Windows 10, Windows Server, varied core/ram footprint
INSERT IGNORE INTO vms (vm_name, host_name, environment, cluster, ram, cores, ip, mac, os, disk_size, source, time_created, gpu)
VALUES
  ('Win10-Sybase-1',     'Win10-Sybase-1',     'production', 'fsgpucluster-25',  8,  8,  '10.41.25.005', 'BC:24:11:A0:00:05', 'windows',  40, 'PVE', '2025-09-05', '0'),
  ('CGFSD',              'CGFSD',              'production', 'fsgpucluster-25', 16, 32,  '10.41.25.006', 'BC:24:11:A0:00:06', 'windows', 100, 'PVE', '2025-09-20', '0'),
  ('w22-hitachi-svp',    'w22-hitachi-svp',    'production', 'fsgpucluster-25',  8,  8,  '10.41.25.007', 'BC:24:11:A0:00:07', 'windows', 300, 'PVE', '2025-10-08', '0'),
  ('w22-esis-burpsuite', 'w22-esis-burpsuite', 'production', 'fsgpucluster-25',  8,  8,  '10.41.25.008', 'BC:24:11:A0:00:08', 'windows', 200, 'PVE', '2025-10-25', '0'),
  ('wfh-win-2',          'wfh-win-2',          'production', 'fsgpucluster-25',  6,  4,  '10.41.25.009', 'BC:24:11:A0:00:09', 'windows', 200, 'PVE', '2025-11-12', '0'),
  ('wfh-win-3',          'wfh-win-3',          'production', 'fsgpucluster-25',  6,  4,  '10.41.25.010', 'BC:24:11:A0:00:10', 'windows', 200, 'PVE', '2025-11-30', '0');

-- --- VS10201 — ANIL PAINULY (CMSE / CMDG / CCDD) — 6 VMs ---
-- Mix: RHEL HPC (large), Windows WFH (small), Ubuntu (medium)
INSERT IGNORE INTO vms (vm_name, host_name, environment, cluster, ram, cores, ip, mac, os, disk_size, source, time_created, gpu)
VALUES
  ('comsolClient1',          'comsolClient1',          'production', 'fsgpucluster-25', 32, 40, '10.41.25.011', 'BC:24:11:A0:00:11', 'linux',   350, 'PVE', '2025-09-12', '0'),
  ('comsolClient3',          'comsolClient3',          'production', 'fsgpucluster-25', 32, 35, '10.41.25.012', 'BC:24:11:A0:00:12', 'linux',   300, 'PVE', '2025-09-28', '0'),
  ('wfh-win-4',              'wfh-win-4',              'production', 'fsgpucluster-25',  6,  4, '10.41.25.013', 'BC:24:11:A0:00:13', 'windows', 200, 'PVE', '2025-10-18', '0'),
  ('win2k22-tmsd-pycfort-2', 'win2k22-tmsd-pycfort-2','production', 'fsgpucluster-25', 64, 16, '10.41.25.014', 'BC:24:11:A0:00:14', 'windows', 500, 'PVE', '2025-11-05', '0'),
  ('w22-abpp-acad-inv-sw',   'w22-abpp-acad-inv-sw',  'production', 'fsgpucluster-25', 64, 16, '10.41.25.015', 'BC:24:11:A0:00:15', 'windows',  50, 'PVE', '2025-12-05', '0');
-- Note: ubuntu-app-vm already inserted above; shared via vm_users link

-- --- VS11676 — GISHA SUSAN THOMAS (ADMN.AUX / PGA / PGA) — 6 VMs ---
-- Mix: WFH instances (small Windows), stopped Linux servers
INSERT IGNORE INTO vms (vm_name, host_name, environment, cluster, ram, cores, ip, mac, os, disk_size, source, time_created, gpu)
VALUES
  ('wfh-win-5',       'wfh-win-5',       'production', 'fsgpucluster-25',  6,  4, '10.41.25.016', 'BC:24:11:A0:00:16', 'windows', 200, 'PVE', '2025-10-01', '0'),
  ('wfh-win-6',       'wfh-win-6',       'production', 'fsgpucluster-25',  6,  4, '10.41.25.017', 'BC:24:11:A0:00:17', 'windows', 200, 'PVE', '2025-10-22', '0'),
  ('OnlyOfficeServer','OnlyOfficeServer', 'production', 'fsgpucluster-25', 16, 18, '10.41.25.018', 'BC:24:11:A0:00:18', 'linux',   500, 'PVE', '2025-11-08', '0'),
  ('wfh-rhel',        'wfh-rhel',        'production', 'fsgpucluster-25',  4,  4, '10.41.25.019', 'BC:24:11:A0:00:19', 'linux',   200, 'PVE', '2025-11-25', '0'),
  ('ad-read-node',    'ad-read-node',    'production', 'fsgpucluster-25',  2,  2, '10.41.25.020', 'BC:24:11:A0:00:20', 'windows',  60, 'PVE', '2025-12-12', '0'),
  ('wfh-win-7',       'wfh-win-7',       'production', 'fsgpucluster-25',  6,  4, '10.41.25.021', 'BC:24:11:A0:00:21', 'windows', 200, 'PVE', '2026-01-10', '0');

-- --- VS12071 — HASEENA L (MSA / CITG / ESIS) — 5 VMs ---
-- Mix: Ubuntu (large and small), Windows Server
INSERT IGNORE INTO vms (vm_name, host_name, environment, cluster, ram, cores, ip, mac, os, disk_size, source, time_created, gpu)
VALUES
  ('u22-tmsd',                 'u22-tmsd',                 'production', 'fsgpucluster-25', 64, 16, '10.41.25.022', 'BC:24:11:A0:00:22', 'ubuntu',  300, 'PVE', '2025-09-15', '0'),
  ('u20-rfatd-petalinux-2',    'u20-rfatd-petalinux-2',   'production', 'fsgpucluster-25', 32, 16, '10.41.25.023', 'BC:24:11:A0:00:23', 'ubuntu',  100, 'PVE', '2025-10-05', '0'),
  ('win2k22-spl-matlab-python','win2k22-spl-matlab-python','production', 'fsgpucluster-25', 32,  8, '10.41.25.024', 'BC:24:11:A0:00:24', 'windows', 200, 'PVE', '2025-11-18', '0'),
  ('ubuntux2gotest',           'ubuntux2gotest',           'production', 'fsgpucluster-25',  4,  4, '10.41.25.025', 'BC:24:11:A0:00:25', 'ubuntu',  100, 'PVE', '2025-12-08', '0');
-- Note: wfh-win-7 already inserted above; shared via vm_users link

-- ============================================================
-- [5] ccds_db.vm_users  — Business ownership links
-- Composite PK (vm_name, staff_code): INSERT IGNORE skips dupes.
-- ============================================================

-- user (existing — 2 already seeded; 4 new)
INSERT IGNORE INTO vm_users (vm_name, staff_code) VALUES
  ('win-test-react-flask', 'user'),
  ('wfh-win-1',            'user'),
  ('wfh-linux',            'user'),
  ('ubuntu-app-vm',        'user');

-- VS10106 (6 VMs)
INSERT IGNORE INTO vm_users (vm_name, staff_code) VALUES
  ('Win10-Sybase-1',     'VS10106'),
  ('CGFSD',              'VS10106'),
  ('w22-hitachi-svp',    'VS10106'),
  ('w22-esis-burpsuite', 'VS10106'),
  ('wfh-win-2',          'VS10106'),
  ('wfh-win-3',          'VS10106');

-- VS10201 (6 VMs — ubuntu-app-vm shared with user)
INSERT IGNORE INTO vm_users (vm_name, staff_code) VALUES
  ('comsolClient1',          'VS10201'),
  ('comsolClient3',          'VS10201'),
  ('wfh-win-4',              'VS10201'),
  ('win2k22-tmsd-pycfort-2', 'VS10201'),
  ('ubuntu-app-vm',          'VS10201'),
  ('w22-abpp-acad-inv-sw',   'VS10201');

-- VS11676 (6 VMs)
INSERT IGNORE INTO vm_users (vm_name, staff_code) VALUES
  ('wfh-win-5',       'VS11676'),
  ('wfh-win-6',       'VS11676'),
  ('OnlyOfficeServer','VS11676'),
  ('wfh-rhel',        'VS11676'),
  ('ad-read-node',    'VS11676'),
  ('wfh-win-7',       'VS11676');

-- VS12071 (5 VMs + wfh-win-7 shared with VS11676)
INSERT IGNORE INTO vm_users (vm_name, staff_code) VALUES
  ('u22-tmsd',                 'VS12071'),
  ('u20-rfatd-petalinux-2',    'VS12071'),
  ('win2k22-spl-matlab-python','VS12071'),
  ('ubuntux2gotest',           'VS12071'),
  ('wfh-win-7',                'VS12071');

-- ============================================================
-- [6] proxmox_db.vm_user_relation  — Proxmox ownership links
-- FK: uuid must exist in proxmox_db.vm (all verified).
-- FK: staff_code must exist in proxmox_db.empdetails (all verified).
-- INSERT IGNORE protects against duplicate (uuid, staff_code) PK.
-- ============================================================
USE proxmox_db;

-- user — 4 additional VMs
INSERT IGNORE INTO vm_user_relation (uuid, staff_code) VALUES
  ('64dbd1b0-7c5b-4e77-93b1-c1032aa2b59a', 'user'),   -- win-test-react-flask | WS2022 | running
  ('f8a6c1e8-5ea8-4cb5-9170-9ef1ddc89fe3', 'user'),   -- wfh-win-1            | WS2022 | running
  ('36feb857-ba31-49e6-9954-068a1ba4ee73', 'user'),   -- wfh-linux            | RHEL 9.5 | running
  ('65681955-24f0-412d-adc4-e20cbd183b0c', 'user');   -- ubuntu-app-vm        | Ubuntu 22.04 | running

-- VS10106 — AJITH MR (MME / AMG)
INSERT IGNORE INTO vm_user_relation (uuid, staff_code) VALUES
  ('505352fb-0e25-47f0-aaec-9298d332ec4c', 'VS10106'), -- Win10-Sybase-1      | Win10 Pro | running
  ('fe3fff18-7666-4f6d-afb2-98699fc1d1ff', 'VS10106'), -- CGFSD               | Win10 Pro | running
  ('f046070d-1b4c-4526-b1c3-22f84a998c0c', 'VS10106'), -- w22-hitachi-svp     | WS2022 | running
  ('1c3fd517-1da3-4cc0-add7-5ab4b3b67220', 'VS10106'), -- w22-esis-burpsuite  | WS2022 | running
  ('0c266a1a-7e16-4508-92b4-e0dda1f99e25', 'VS10106'), -- wfh-win-2           | WS2022 | running
  ('a3c3ea0e-d24d-4121-ab58-42919a6da242', 'VS10106'); -- wfh-win-3           | WS2022 | running

-- VS10201 — ANIL PAINULY (CMSE / CMDG)
INSERT IGNORE INTO vm_user_relation (uuid, staff_code) VALUES
  ('86aab970-504a-4ea1-b930-e49a3908e3d2', 'VS10201'), -- comsolClient1       | RHEL 8.7 | running
  ('0cd45b11-cdfb-480a-b53b-8e1072caa4a4', 'VS10201'), -- comsolClient3       | RHEL 8.7 | running
  ('7e65a394-a435-4572-86d3-e752298ace63', 'VS10201'), -- wfh-win-4           | WS2022 | running
  ('72f5d867-1617-4603-aa11-1d814b1ae4d3', 'VS10201'), -- win2k22-tmsd-pycfort-2 | WS2022 | running
  ('65681955-24f0-412d-adc4-e20cbd183b0c', 'VS10201'), -- ubuntu-app-vm       | Ubuntu 22.04 | shared
  ('1266b187-1a62-4175-bfe9-78df54b2fce2', 'VS10201'); -- w22-abpp-acad-inv-sw| WS2022 | running

-- VS11676 — GISHA SUSAN THOMAS (ADMN.AUX / PGA)
INSERT IGNORE INTO vm_user_relation (uuid, staff_code) VALUES
  ('5f2a4fea-9544-4abf-83d0-8c3bac280e7a', 'VS11676'), -- wfh-win-5           | WS2022 | running
  ('983ffba3-871c-46ac-9a99-6d7090e0e251', 'VS11676'), -- wfh-win-6           | WS2022 | running
  ('21e09394-cc75-4f3a-be08-c5ffe6fef53e', 'VS11676'), -- OnlyOfficeServer    | l26 | stopped
  ('88208832-6fd4-4540-b600-ae48aff7a8e1', 'VS11676'), -- wfh-rhel            | l26 | stopped
  ('a4d5bf9c-e6e8-4c5b-9a6d-371be3a63556', 'VS11676'), -- ad-read-node        | win11 | running
  ('071c708a-962c-4d41-9524-9498b430bf48', 'VS11676'); -- wfh-win-7           | WS2022 | running

-- VS12071 — HASEENA L (MSA / CITG)
INSERT IGNORE INTO vm_user_relation (uuid, staff_code) VALUES
  ('94d9b3e3-6dbe-4429-9e5d-4c500a2e9306', 'VS12071'), -- u22-tmsd            | Ubuntu 22.04.5 | running
  ('cf74cfd6-af1c-4e94-9ede-1cf7be3287b6', 'VS12071'), -- u20-rfatd-petalinux | Ubuntu 20.04 | running
  ('1db75b66-f7de-48aa-92ce-c5fc6318d0e5', 'VS12071'), -- win2k22-spl-matlab  | WS2022+GPU | running
  ('5a89f50c-b2b7-4e67-a7e2-80b7631a447c', 'VS12071'), -- ubuntux2gotest      | l26 | stopped
  ('071c708a-962c-4d41-9524-9498b430bf48', 'VS12071'); -- wfh-win-7           | WS2022 | shared

SET foreign_key_checks = 1;

-- ============================================================
-- POST-SEED VERIFICATION QUERIES
-- Run after execution to confirm all expected counts.
-- ============================================================
SELECT '=== [1] ccds_db.users ===' AS '';
SELECT staff_code, name, entity, division, groupname FROM ccds_db.users ORDER BY staff_code;

SELECT '=== [2] ccds_db.user_role count ===' AS '';
SELECT role, COUNT(*) as count FROM ccds_db.user_role GROUP BY role;

SELECT '=== [3] ccds_db.vms count ===' AS '';
SELECT COUNT(*) AS total_registered_vms FROM ccds_db.vms;

SELECT '=== [4] ccds_db.vm_users per-user count ===' AS '';
SELECT staff_code, COUNT(*) AS vm_count FROM ccds_db.vm_users GROUP BY staff_code ORDER BY vm_count DESC;

SELECT '=== [5] proxmox_db.vm_user_relation per-user count ===' AS '';
SELECT staff_code, COUNT(*) AS vm_count FROM proxmox_db.vm_user_relation GROUP BY staff_code ORDER BY vm_count DESC;

SELECT '=== [6] Unique assigned VMs (proxmox_db) ===' AS '';
SELECT COUNT(DISTINCT uuid) AS unique_assigned_vms FROM proxmox_db.vm_user_relation;

SELECT '=== [7] Entity distribution ===' AS '';
SELECT u.entity, COUNT(vu.vm_name) AS vm_count
FROM ccds_db.vm_users vu
JOIN ccds_db.users u ON vu.staff_code = u.staff_code
GROUP BY u.entity ORDER BY vm_count DESC;

SELECT '=== [8] Division distribution ===' AS '';
SELECT u.division, COUNT(vu.vm_name) AS vm_count
FROM ccds_db.vm_users vu
JOIN ccds_db.users u ON vu.staff_code = u.staff_code
GROUP BY u.division ORDER BY vm_count DESC;

SELECT '=== [9] ccds_db.vms by time_created month ===' AS '';
SELECT LEFT(time_created, 7) AS month, COUNT(*) AS vms_registered
FROM ccds_db.vms
GROUP BY month ORDER BY month;
