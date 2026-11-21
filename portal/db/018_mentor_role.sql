-- Mentors (partner institutes, class teachers): see only the students in batches where batches.faculty_id is them.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('student', 'faculty', 'content', 'support', 'admin', 'mentor'));
create index if not exists batches_faculty_idx on batches (faculty_id);
create index if not exists batch_members_user_idx on batch_members (user_id);
