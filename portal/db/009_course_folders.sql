-- A Tests-screen folder can show a course's tests: every live test in that course (optionally only some
-- test types) appears there, so one test added to several courses shows up under each of them.
alter table catalog_nodes add column if not exists course_id uuid references courses(id) on delete set null;
alter table catalog_nodes add column if not exists test_types text[];
-- How many times students opened a test's page.
alter table tests add column if not exists views int not null default 0;

update catalog_nodes n set course_id = c.id, test_types = m.types
from (values
  ('cat-mocks', 'cat-10', '{full_mock,pyq}'::text[]),
  ('ts-mocks', 'cat-ts', '{full_mock,pyq}'),
  ('ts-sec', 'cat-ts', '{sectional}'),
  ('ts-topic', 'cat-ts', '{topic}'),
  ('cat-daily', 'cat-daily-free-test', '{daily}'),
  ('cet-mocks', 'cet-mock', '{full_mock,pyq}'),
  ('cet-sm', 'cet-ts', '{full_mock,pyq}'),
  ('cet-sec', 'cet-ts', '{sectional}'),
  ('cet-topic', 'cet-ts', '{topic}'),
  ('snap-mocks', 'om-single', '{full_mock,pyq}'),
  ('snap-sec', 'om-single', '{sectional}'),
  ('snap-topic', 'om-single', '{topic}')
) as m(node, course, types)
join courses c on c.slug = m.course
where n.id = m.node and n.course_id is null;
