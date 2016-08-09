CREATE TABLE public.submissions
(
  task text NOT NULL,
  index integer NOT NULL,
  input text,
  fields json,
  CONSTRAINT submissions_pkey PRIMARY KEY (task, index)
);

CREATE INDEX submissions_task_index
  ON public.submissions
  USING btree
  (task COLLATE pg_catalog."default");
