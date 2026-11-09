-- MBA-CET: full MAH-CET syllabus topics (for 3 topic tests per topic) and the series folder labels.
-- Applied to production on 9 Nov 2026. Safe to run again.
with add(sec, name) as (values
 ('LR','Direction Sense'),('LR','Ranking & Order'),('LR','Coded Inequalities'),('LR','Statement & Conclusion'),('LR','Statement & Assumption'),('LR','Course of Action'),('LR','Data Sufficiency'),('LR','Venn Diagrams'),('LR','Clocks & Calendars'),
 ('AR','Mirror & Water Images'),('AR','Embedded Figures'),('AR','Paper Folding & Cutting'),('AR','Cubes & Dice'),('AR','Figure Counting'),
 ('QA','Number System'),('QA','Simplification & Approximation'),('QA','Number Series'),('QA','Averages'),('QA','Simple & Compound Interest'),('QA','Time, Speed & Distance'),('QA','Mixtures & Alligations'),('QA','Quadratic Equations'),('QA','Mensuration'),('QA','Permutation & Combination'),('QA','Probability'),('QA','Data Sufficiency'),
 ('VA','Error Spotting'),('VA','Sentence Correction'),('VA','Synonyms & Antonyms'),('VA','Idioms & Phrases'),('VA','Cloze Test'),('VA','One-word Substitution'),('VA','Verbal Analogies'))
insert into topics (section_id, name, sort)
select s.id, a.name, 100 + row_number() over (partition by s.id order by a.name)
from add a join sections s on s.code = a.sec and s.exam_id = (select id from exams where code = 'MBA-CET')
on conflict (section_id, name) do nothing;

-- One topic-test folder per topic, under the section's topic folder.
insert into catalog_nodes (id, parent_id, exam_group, exam_id, name, sub, sort, is_free)
select 'cet-tp-' || trim(both '-' from lower(regexp_replace(replace(t.name, '&', 'and'), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || lower(s.code),
       'cet-tp-' || lower(s.code), 'mba', s.exam_id, t.name, '3 tests · 10 Q · 15 min',
       (select sort from catalog_nodes where id = 'cet-tp-' || lower(s.code)) + t.sort, false
from topics t join sections s on s.id = t.section_id
where s.exam_id = (select id from exams where code = 'MBA-CET') and t.sort >= 100
on conflict (id) do nothing;

update catalog_nodes set sub = '10 tests' where id in ('cet-sec-lr', 'cet-sec-ar', 'cet-sec-qa', 'cet-sec-va');
update catalog_nodes set sub = '30 mocks · 200 Q · 150 min · 10 easy, 10 medium, 10 hard' where id = 'cet-sm';
