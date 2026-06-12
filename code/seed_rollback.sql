-- ============================================================
-- VMDash Seed Rollback Script
-- Generated: 2026-06-12
-- Purpose: Undo all changes made by seed_active.sql
-- This does NOT touch any original records that existed before seeding.
-- Run as: mysql -u admin -p < seed_rollback.sql
-- ============================================================

SET NAMES utf8mb4;
SET foreign_key_checks = 0;

-- ============================================================
-- STEP 1: Remove proxmox_db ownership links (vm_user_relation)
-- ============================================================
USE proxmox_db;

DELETE FROM vm_user_relation WHERE staff_code IN ('VS10106','VS10201','VS11676','VS12071');

DELETE FROM vm_user_relation WHERE staff_code = 'user' AND uuid IN (
  '64dbd1b0-7c5b-4e77-93b1-c1032aa2b59a',
  'f8a6c1e8-5ea8-4cb5-9170-9ef1ddc89fe3',
  '36feb857-ba31-49e6-9954-068a1ba4ee73',
  '65681955-24f0-412d-adc4-e20cbd183b0c'
);

-- ============================================================
-- STEP 2: Remove ccds_db vm_users (ownership links)
-- ============================================================
USE ccds_db;

DELETE FROM vm_users WHERE staff_code IN ('VS10106','VS10201','VS11676','VS12071');

DELETE FROM vm_users WHERE staff_code = 'user' AND vm_name IN (
  'win-test-react-flask',
  'wfh-win-1',
  'wfh-linux',
  'ubuntu-app-vm'
);

-- ============================================================
-- STEP 3: Remove ccds_db VM registrations added by this seed
-- ============================================================

DELETE FROM vms WHERE vm_name IN (
  -- user VMs
  'win-test-react-flask',
  'wfh-win-1',
  'wfh-linux',
  'ubuntu-app-vm',
  -- VS10106 VMs
  'Win10-Sybase-1',
  'CGFSD',
  'w22-hitachi-svp',
  'w22-esis-burpsuite',
  'wfh-win-2',
  'wfh-win-3',
  -- VS10201 VMs
  'comsolClient1',
  'comsolClient3',
  'wfh-win-4',
  'win2k22-tmsd-pycfort-2',
  'w22-abpp-acad-inv-sw',
  -- VS11676 VMs
  'wfh-win-5',
  'wfh-win-6',
  'OnlyOfficeServer',
  'wfh-rhel',
  'ad-read-node',
  'wfh-win-7',
  -- VS12071 VMs
  'u22-tmsd',
  'u20-rfatd-petalinux-2',
  'win2k22-spl-matlab-python',
  'ubuntux2gotest'
);

-- ============================================================
-- STEP 4: Remove ccds_db user_role entries
-- ============================================================

DELETE FROM user_role WHERE staff_code1 IN ('VS10106','VS10201','VS11676','VS12071');

-- ============================================================
-- STEP 5: Remove ccds_db users
-- ============================================================

DELETE FROM users WHERE staff_code IN ('VS10106','VS10201','VS11676','VS12071');

SET foreign_key_checks = 1;

-- ============================================================
-- POST-ROLLBACK VERIFICATION
-- ============================================================
SELECT '=== ccds_db.users after rollback ===' AS check_name;
SELECT staff_code, name FROM ccds_db.users;

SELECT '=== ccds_db.vm_users after rollback ===' AS check_name;
SELECT COUNT(*) AS total_vm_user_links FROM ccds_db.vm_users;

SELECT '=== proxmox_db.vm_user_relation after rollback ===' AS check_name;
SELECT uuid, staff_code FROM proxmox_db.vm_user_relation;
