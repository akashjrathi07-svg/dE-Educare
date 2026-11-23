-- Optional manual position of a test in lists (1 = first). Empty = automatic order by the number in its name.
alter table tests add column if not exists position integer;
