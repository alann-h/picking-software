--
-- PostgreSQL database dump
--

\restrict hSJw3PsIeOpaiVJ5476VGMKN0ggfLZ6OQcw9pk9rvXhedMnnxvHHcQfZ41TdWCq

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg12+1)

-- Started on 2025-08-21 12:10:31 AEST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 24677)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3511 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 272 (class 1255 OID 25040)
-- Name: cleanup_old_security_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_security_events() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_events 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- TOC entry 235 (class 1255 OID 24667)
-- Name: trigger_set_lastmodified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_lastmodified() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.lastmodified = NOW();
    RETURN NEW;
END;
$$;


--
-- TOC entry 234 (class 1255 OID 24612)
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 16418)
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    qb_token text NOT NULL,
    company_name character varying(255) NOT NULL,
    companyid character varying(255) NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 16423)
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    customerid integer NOT NULL,
    customername character varying(255) NOT NULL,
    companyid character varying(255)
);


--
-- TOC entry 227 (class 1259 OID 24599)
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    s3_key character varying(255) NOT NULL,
    companyid character varying(255) NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0 NOT NULL,
    progress_message character varying(255) DEFAULT 'File is queued for processing.'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 16428)
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    productname character varying(255) NOT NULL,
    barcode character varying(255),
    sku character varying(255) NOT NULL,
    quantity_on_hand numeric(10,2),
    price numeric(6,2),
    companyid character varying(255) NOT NULL,
    category character varying(255),
    qbo_item_id character varying(255),
    productid integer NOT NULL,
    tax_code_ref character varying(255),
    is_archived boolean DEFAULT false NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 16433)
-- Name: products_productid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_productid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 222 (class 1259 OID 16434)
-- Name: products_productid_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_productid_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3512 (class 0 OID 0)
-- Dependencies: 222
-- Name: products_productid_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_productid_seq1 OWNED BY public.products.productid;


--
-- TOC entry 223 (class 1259 OID 16435)
-- Name: quoteitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quoteitems (
    quoteid integer NOT NULL,
    barcode character varying(255),
    productname character varying(255) NOT NULL,
    originalqty numeric(10,2) NOT NULL,
    pickingqty numeric(10,2) NOT NULL,
    pickingstatus character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    productid integer NOT NULL,
    sku character varying(255) NOT NULL,
    price numeric(6,2) NOT NULL,
    companyid character varying(255) NOT NULL,
    tax_code_ref character varying(255) NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 16440)
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    quoteid integer NOT NULL,
    customerid integer NOT NULL,
    totalamount numeric(10,2) NOT NULL,
    customername character varying(255) NOT NULL,
    orderstatus character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    timestarted timestamp with time zone DEFAULT now() NOT NULL,
    lastmodified timestamp with time zone DEFAULT now() NOT NULL,
    companyid character varying(255) NOT NULL,
    ordernote text,
    pickernote text,
    preparer_names character varying(255)
);


--
-- TOC entry 232 (class 1259 OID 25020)
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id integer NOT NULL,
    user_id character varying(36),
    email character varying(255),
    event_type character varying(100) NOT NULL,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now(),
    metadata jsonb
);


--
-- TOC entry 3513 (class 0 OID 0)
-- Dependencies: 232
-- Name: COLUMN security_events.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.security_events.metadata IS 'Additional event data in JSON format';


--
-- TOC entry 233 (class 1259 OID 25036)
-- Name: recent_security_events; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.recent_security_events AS
 SELECT event_type,
    email,
    ip_address,
    "timestamp",
    metadata
   FROM public.security_events
  WHERE ("timestamp" > (now() - '24:00:00'::interval))
  ORDER BY "timestamp" DESC;


--
-- TOC entry 230 (class 1259 OID 24753)
-- Name: run_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.run_items (
    id integer NOT NULL,
    run_id uuid NOT NULL,
    quoteid integer NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 24752)
-- Name: run_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.run_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3514 (class 0 OID 0)
-- Dependencies: 229
-- Name: run_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.run_items_id_seq OWNED BY public.run_items.id;


--
-- TOC entry 228 (class 1259 OID 24670)
-- Name: runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    companyid character varying(255) NOT NULL,
    run_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 25019)
-- Name: security_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.security_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3515 (class 0 OID 0)
-- Dependencies: 231
-- Name: security_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.security_events_id_seq OWNED BY public.security_events.id;


--
-- TOC entry 225 (class 1259 OID 16445)
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 16450)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    display_email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    given_name character varying(255) NOT NULL,
    family_name character varying(255),
    id character varying(255) NOT NULL,
    companyid character varying(255) NOT NULL,
    normalised_email character varying(255) NOT NULL,
    failed_attempts integer DEFAULT 0,
    last_failed_attempt timestamp without time zone,
    locked_until timestamp without time zone
);


--
-- TOC entry 3292 (class 2604 OID 16456)
-- Name: products productid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN productid SET DEFAULT nextval('public.products_productid_seq1'::regclass);


--
-- TOC entry 3309 (class 2604 OID 24756)
-- Name: run_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_items ALTER COLUMN id SET DEFAULT nextval('public.run_items_id_seq'::regclass);


--
-- TOC entry 3312 (class 2604 OID 25023)
-- Name: security_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events ALTER COLUMN id SET DEFAULT nextval('public.security_events_id_seq'::regclass);


--
-- TOC entry 3315 (class 2606 OID 16494)
-- Name: companies companies_companyid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_companyid_unique UNIQUE (companyid);


--
-- TOC entry 3317 (class 2606 OID 16489)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (companyid);


--
-- TOC entry 3321 (class 2606 OID 16458)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (customerid);


--
-- TOC entry 3345 (class 2606 OID 24611)
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- TOC entry 3323 (class 2606 OID 16460)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (productid);


--
-- TOC entry 3325 (class 2606 OID 24785)
-- Name: products products_qbo_item_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_qbo_item_id_unique UNIQUE (qbo_item_id);


--
-- TOC entry 3331 (class 2606 OID 16464)
-- Name: quoteitems quoteitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quoteitems
    ADD CONSTRAINT quoteitems_pkey PRIMARY KEY (quoteid, productid);


--
-- TOC entry 3333 (class 2606 OID 16466)
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (quoteid);


--
-- TOC entry 3349 (class 2606 OID 24760)
-- Name: run_items run_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_items
    ADD CONSTRAINT run_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3347 (class 2606 OID 24716)
-- Name: runs runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.runs
    ADD CONSTRAINT runs_pkey PRIMARY KEY (id);


--
-- TOC entry 3352 (class 2606 OID 25028)
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- TOC entry 3336 (class 2606 OID 16468)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- TOC entry 3319 (class 2606 OID 16472)
-- Name: companies unique_companyid; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT unique_companyid UNIQUE (companyid);


--
-- TOC entry 3328 (class 2606 OID 24966)
-- Name: products uq_products_sku; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT uq_products_sku UNIQUE (sku);


--
-- TOC entry 3339 (class 2606 OID 16474)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (display_email);


--
-- TOC entry 3341 (class 2606 OID 24586)
-- Name: users users_normalised_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_normalised_email_key UNIQUE (normalised_email);


--
-- TOC entry 3343 (class 2606 OID 16476)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3329 (class 1259 OID 24771)
-- Name: idx_quoteitems_on_quoteid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quoteitems_on_quoteid ON public.quoteitems USING btree (quoteid);


--
-- TOC entry 3350 (class 1259 OID 25034)
-- Name: idx_security_events_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_ip_address ON public.security_events USING btree (ip_address);


--
-- TOC entry 3334 (class 1259 OID 16477)
-- Name: idx_sessions_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expire ON public.sessions USING btree (expire);


--
-- TOC entry 3337 (class 1259 OID 25035)
-- Name: idx_users_locked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_locked_until ON public.users USING btree (locked_until);


--
-- TOC entry 3326 (class 1259 OID 24838)
-- Name: unique_barcode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_barcode_idx ON public.products USING btree (barcode) WHERE ((barcode IS NOT NULL) AND ((barcode)::text <> ''::text));


--
-- TOC entry 3360 (class 2620 OID 24668)
-- Name: quotes set_lastmodified_on_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_lastmodified_on_change BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.trigger_set_lastmodified();


--
-- TOC entry 3361 (class 2620 OID 24613)
-- Name: jobs set_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_timestamp BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- TOC entry 3357 (class 2606 OID 24766)
-- Name: run_items fk_quote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_items
    ADD CONSTRAINT fk_quote FOREIGN KEY (quoteid) REFERENCES public.quotes(quoteid) ON DELETE CASCADE;


--
-- TOC entry 3353 (class 2606 OID 24772)
-- Name: quoteitems fk_quote; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quoteitems
    ADD CONSTRAINT fk_quote FOREIGN KEY (quoteid) REFERENCES public.quotes(quoteid) ON DELETE CASCADE;


--
-- TOC entry 3358 (class 2606 OID 24761)
-- Name: run_items fk_run; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.run_items
    ADD CONSTRAINT fk_run FOREIGN KEY (run_id) REFERENCES public.runs(id) ON DELETE CASCADE;


--
-- TOC entry 3354 (class 2606 OID 16478)
-- Name: quoteitems quoteitems_productid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quoteitems
    ADD CONSTRAINT quoteitems_productid_fkey FOREIGN KEY (productid) REFERENCES public.products(productid);


--
-- TOC entry 3355 (class 2606 OID 16483)
-- Name: quoteitems quoteitems_quoteid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quoteitems
    ADD CONSTRAINT quoteitems_quoteid_fkey FOREIGN KEY (quoteid) REFERENCES public.quotes(quoteid);


--
-- TOC entry 3359 (class 2606 OID 25029)
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3356 (class 2606 OID 16495)
-- Name: users users_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(companyid);


-- Completed on 2025-08-21 12:10:41 AEST

--
-- PostgreSQL database dump complete
--

\unrestrict hSJw3PsIeOpaiVJ5476VGMKN0ggfLZ6OQcw9pk9rvXhedMnnxvHHcQfZ41TdWCq

