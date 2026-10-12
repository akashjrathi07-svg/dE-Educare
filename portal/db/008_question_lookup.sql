-- Fast question lookups for practice sets, auto-built tests and Guru: by topic and level, by subtopic, by tag.
create index if not exists questions_topic_level_idx on questions (topic_id, difficulty) where status = 'live';
create index if not exists questions_subtopic_idx on questions (section_id, lower(subtopic)) where subtopic is not null;
create index if not exists questions_tags_idx on questions using gin (tags);
