-- The original vendor_profiles.status check (create_vendor_profiles.sql) only
-- allows 'pending_review' | 'approved' | 'rejected'. The admin "approve"
-- action and the /admin/vendors UI use 'active' instead of 'approved', so
-- approving a vendor currently fails the check constraint. This swaps
-- 'approved' for 'active' in the allowed set.
alter table vendor_profiles drop constraint if exists vendor_profiles_status_check;
alter table vendor_profiles add constraint vendor_profiles_status_check
  check (status in ('pending_review', 'active', 'rejected'));
