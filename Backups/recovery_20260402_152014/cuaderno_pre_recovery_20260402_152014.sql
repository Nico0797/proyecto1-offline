--
-- PostgreSQL database dump
--

\restrict Si1JeLsEhncRPMBGfA2HARxbZJfFSxJYEjz5ScH94UGKsI534PFKTyb6qx6XnFf

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    value text,
    updated_at timestamp without time zone
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: app_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_settings_id_seq OWNER TO postgres;

--
-- Name: app_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_settings_id_seq OWNED BY public.app_settings.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    entity character varying(50) NOT NULL,
    entity_id integer,
    old_value json,
    new_value json,
    ip_address character varying(45),
    user_agent character varying(255),
    "timestamp" timestamp without time zone,
    business_id integer,
    actor_user_id integer,
    actor_member_id integer,
    actor_name character varying(100),
    actor_role character varying(100),
    module character varying(50),
    entity_type character varying(50),
    summary text,
    metadata_json json,
    before_json json,
    after_json json
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: banners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banners (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    image_url text NOT NULL,
    link text,
    active boolean,
    "order" integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.banners OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banners_id_seq OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banners_id_seq OWNED BY public.banners.id;


--
-- Name: business_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_modules (
    id integer NOT NULL,
    business_id integer NOT NULL,
    module_key character varying(50) NOT NULL,
    enabled boolean NOT NULL,
    config json,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.business_modules OWNER TO postgres;

--
-- Name: business_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_modules_id_seq OWNER TO postgres;

--
-- Name: business_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_modules_id_seq OWNED BY public.business_modules.id;


--
-- Name: business_profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_profile (
    id integer NOT NULL,
    business_name text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text,
    tax_id text DEFAULT ''::text,
    address text DEFAULT ''::text,
    message text DEFAULT ''::text,
    updated_at text DEFAULT ''::text,
    CONSTRAINT business_profile_id_check CHECK ((id = 1))
);


ALTER TABLE public.business_profile OWNER TO postgres;

--
-- Name: business_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_profile_id_seq OWNER TO postgres;

--
-- Name: business_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_profile_id_seq OWNED BY public.business_profile.id;


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(255) NOT NULL,
    currency character varying(10),
    timezone character varying(50),
    settings json,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    monthly_sales_goal double precision DEFAULT 0,
    whatsapp_templates json DEFAULT '{}'::json
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.businesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.businesses_id_seq OWNER TO postgres;

--
-- Name: businesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.businesses_id_seq OWNED BY public.businesses.id;


--
-- Name: client_sync_operations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_sync_operations (
    id integer NOT NULL,
    business_id integer NOT NULL,
    user_id integer NOT NULL,
    client_operation_id character varying(120) NOT NULL,
    entity_type character varying(50) NOT NULL,
    action character varying(30) NOT NULL,
    status character varying(20) NOT NULL,
    entity_id integer,
    response_status integer,
    response_payload json,
    error_message text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.client_sync_operations OWNER TO postgres;

--
-- Name: client_sync_operations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_sync_operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_sync_operations_id_seq OWNER TO postgres;

--
-- Name: client_sync_operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_sync_operations_id_seq OWNED BY public.client_sync_operations.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    address text,
    notes text,
    active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by_user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    updated_by_user_id integer
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: debt_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.debt_payments (
    id integer NOT NULL,
    debt_id integer NOT NULL,
    amount double precision NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50),
    note text,
    created_at timestamp without time zone,
    treasury_account_id integer
);


ALTER TABLE public.debt_payments OWNER TO postgres;

--
-- Name: debt_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.debt_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.debt_payments_id_seq OWNER TO postgres;

--
-- Name: debt_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.debt_payments_id_seq OWNED BY public.debt_payments.id;


--
-- Name: debts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.debts (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    creditor_name character varying(255),
    category character varying(100),
    total_amount double precision NOT NULL,
    balance_due double precision NOT NULL,
    start_date date,
    due_date date,
    frequency character varying(20),
    interest_rate double precision,
    installments integer,
    estimated_installment double precision,
    status character varying(20),
    notes text,
    reminder_enabled boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    origin_type character varying(20) DEFAULT 'manual'::character varying,
    recurring_expense_id integer,
    generated_from_due_date date
);


ALTER TABLE public.debts OWNER TO postgres;

--
-- Name: debts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.debts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.debts_id_seq OWNER TO postgres;

--
-- Name: debts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.debts_id_seq OWNED BY public.debts.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    business_id integer NOT NULL,
    expense_date date NOT NULL,
    category character varying(100) NOT NULL,
    amount double precision NOT NULL,
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by_user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    updated_by_user_id integer,
    source_type character varying(20) DEFAULT 'manual'::character varying,
    payment_method character varying(50),
    recurring_expense_id integer,
    debt_id integer,
    debt_payment_id integer,
    raw_purchase_id integer,
    supplier_payable_id integer,
    supplier_payment_id integer,
    treasury_account_id integer
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: faqs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faqs (
    id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    active boolean,
    "order" integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.faqs OWNER TO postgres;

--
-- Name: faqs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faqs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faqs_id_seq OWNER TO postgres;

--
-- Name: faqs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    product_id integer,
    description text NOT NULL,
    quantity double precision NOT NULL,
    unit_price double precision NOT NULL,
    discount double precision NOT NULL,
    tax_rate double precision NOT NULL,
    line_total double precision NOT NULL,
    sort_order integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO postgres;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoice_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_payments (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    amount double precision NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50),
    note text,
    created_by integer,
    created_at timestamp without time zone,
    treasury_account_id integer,
    event_type character varying(20) DEFAULT 'payment'::character varying NOT NULL,
    source_payment_id integer
);


ALTER TABLE public.invoice_payments OWNER TO postgres;

--
-- Name: invoice_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_payments_id_seq OWNER TO postgres;

--
-- Name: invoice_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_payments_id_seq OWNED BY public.invoice_payments.id;


--
-- Name: invoice_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_settings (
    id integer NOT NULL,
    business_id integer NOT NULL,
    prefix character varying(20) NOT NULL,
    logo_url text,
    brand_color character varying(20) NOT NULL,
    accent_color character varying(20) NOT NULL,
    footer_text text,
    default_notes text,
    default_terms text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.invoice_settings OWNER TO postgres;

--
-- Name: invoice_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_settings_id_seq OWNER TO postgres;

--
-- Name: invoice_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_settings_id_seq OWNED BY public.invoice_settings.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer,
    invoice_number character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    issue_date date NOT NULL,
    due_date date,
    currency character varying(10) NOT NULL,
    subtotal double precision NOT NULL,
    discount_total double precision NOT NULL,
    tax_total double precision NOT NULL,
    total double precision NOT NULL,
    notes text,
    payment_method character varying(50),
    created_by integer,
    sent_at timestamp without time zone,
    paid_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO postgres;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: ledger_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_allocations (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    charge_id integer NOT NULL,
    amount double precision NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.ledger_allocations OWNER TO postgres;

--
-- Name: ledger_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ledger_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_allocations_id_seq OWNER TO postgres;

--
-- Name: ledger_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ledger_allocations_id_seq OWNED BY public.ledger_allocations.id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer NOT NULL,
    entry_type character varying(20) NOT NULL,
    amount double precision NOT NULL,
    entry_date date NOT NULL,
    note text,
    ref_type character varying(20),
    ref_id integer,
    created_at timestamp without time zone
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ledger_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_entries_id_seq OWNER TO postgres;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ledger_entries_id_seq OWNED BY public.ledger_entries.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer,
    order_number character varying(50) NOT NULL,
    status character varying(20),
    items json NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision,
    total double precision NOT NULL,
    notes text,
    order_date timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer NOT NULL,
    sale_id integer,
    payment_date date NOT NULL,
    amount double precision NOT NULL,
    method character varying(20),
    note text,
    created_at timestamp without time zone,
    created_by_user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    updated_by_user_id integer,
    treasury_account_id integer,
    updated_at timestamp without time zone
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    category character varying(50),
    created_at timestamp without time zone,
    scope character varying(20) DEFAULT 'business'::character varying
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: product_barcodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_barcodes (
    id integer NOT NULL,
    product_id integer NOT NULL,
    code character varying(100) NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.product_barcodes OWNER TO postgres;

--
-- Name: product_barcodes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_barcodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_barcodes_id_seq OWNER TO postgres;

--
-- Name: product_barcodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_barcodes_id_seq OWNED BY public.product_barcodes.id;


--
-- Name: product_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_movements (
    id integer NOT NULL,
    product_id integer NOT NULL,
    business_id integer NOT NULL,
    user_id integer,
    type character varying(20) NOT NULL,
    quantity double precision NOT NULL,
    reason character varying(255),
    created_at timestamp without time zone,
    created_by_name character varying(100),
    created_by_role character varying(50)
);


ALTER TABLE public.product_movements OWNER TO postgres;

--
-- Name: product_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_movements_id_seq OWNER TO postgres;

--
-- Name: product_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_movements_id_seq OWNED BY public.product_movements.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    sku character varying(50),
    price double precision NOT NULL,
    cost double precision,
    unit character varying(50),
    stock double precision,
    low_stock_threshold double precision,
    active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    type character varying(20) DEFAULT 'product'::character varying,
    description text,
    image text,
    fulfillment_mode character varying(30)
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: quick_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quick_notes (
    id integer NOT NULL,
    business_id integer NOT NULL,
    note text NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.quick_notes OWNER TO postgres;

--
-- Name: quick_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quick_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quick_notes_id_seq OWNER TO postgres;

--
-- Name: quick_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quick_notes_id_seq OWNED BY public.quick_notes.id;


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_items (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    product_id integer,
    description text NOT NULL,
    quantity double precision NOT NULL,
    unit_price double precision NOT NULL,
    subtotal double precision NOT NULL,
    sort_order integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    fulfillment_mode character varying(30)
);


ALTER TABLE public.quote_items OWNER TO postgres;

--
-- Name: quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_items_id_seq OWNER TO postgres;

--
-- Name: quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quote_items_id_seq OWNED BY public.quote_items.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer,
    quote_code character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    issue_date date NOT NULL,
    expiry_date date,
    subtotal double precision NOT NULL,
    discount double precision NOT NULL,
    total double precision NOT NULL,
    notes text,
    terms text,
    created_by integer,
    converted_sale_id integer,
    converted_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotes_id_seq OWNER TO postgres;

--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: raw_material_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raw_material_movements (
    id integer NOT NULL,
    raw_material_id integer NOT NULL,
    business_id integer NOT NULL,
    created_by integer,
    movement_type character varying(20) NOT NULL,
    quantity double precision NOT NULL,
    previous_stock double precision NOT NULL,
    new_stock double precision NOT NULL,
    reference_cost double precision,
    notes text,
    created_at timestamp without time zone,
    created_by_name character varying(100),
    created_by_role character varying(50),
    raw_purchase_id integer,
    recipe_consumption_id integer
);


ALTER TABLE public.raw_material_movements OWNER TO postgres;

--
-- Name: raw_material_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raw_material_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_material_movements_id_seq OWNER TO postgres;

--
-- Name: raw_material_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raw_material_movements_id_seq OWNED BY public.raw_material_movements.id;


--
-- Name: raw_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raw_materials (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    sku character varying(50),
    unit character varying(50) NOT NULL,
    current_stock double precision NOT NULL,
    minimum_stock double precision NOT NULL,
    reference_cost double precision,
    notes text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.raw_materials OWNER TO postgres;

--
-- Name: raw_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raw_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_materials_id_seq OWNER TO postgres;

--
-- Name: raw_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raw_materials_id_seq OWNED BY public.raw_materials.id;


--
-- Name: raw_purchase_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raw_purchase_items (
    id integer NOT NULL,
    raw_purchase_id integer NOT NULL,
    raw_material_id integer NOT NULL,
    description text,
    quantity double precision NOT NULL,
    unit_cost double precision NOT NULL,
    subtotal double precision NOT NULL,
    created_at timestamp without time zone
);


ALTER TABLE public.raw_purchase_items OWNER TO postgres;

--
-- Name: raw_purchase_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raw_purchase_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_purchase_items_id_seq OWNER TO postgres;

--
-- Name: raw_purchase_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raw_purchase_items_id_seq OWNED BY public.raw_purchase_items.id;


--
-- Name: raw_purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raw_purchases (
    id integer NOT NULL,
    business_id integer NOT NULL,
    supplier_id integer,
    purchase_number character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    purchase_date date NOT NULL,
    subtotal double precision NOT NULL,
    total double precision NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.raw_purchases OWNER TO postgres;

--
-- Name: raw_purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raw_purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_purchases_id_seq OWNER TO postgres;

--
-- Name: raw_purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raw_purchases_id_seq OWNED BY public.raw_purchases.id;


--
-- Name: recipe_consumption_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_consumption_items (
    id integer NOT NULL,
    recipe_consumption_id integer NOT NULL,
    raw_material_id integer NOT NULL,
    quantity_consumed double precision NOT NULL,
    previous_stock double precision NOT NULL,
    new_stock double precision NOT NULL,
    raw_material_movement_id integer,
    created_at timestamp without time zone
);


ALTER TABLE public.recipe_consumption_items OWNER TO postgres;

--
-- Name: recipe_consumption_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipe_consumption_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipe_consumption_items_id_seq OWNER TO postgres;

--
-- Name: recipe_consumption_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipe_consumption_items_id_seq OWNED BY public.recipe_consumption_items.id;


--
-- Name: recipe_consumptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_consumptions (
    id integer NOT NULL,
    business_id integer NOT NULL,
    recipe_id integer,
    product_id integer,
    related_sale_id integer,
    quantity_produced_or_sold double precision NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone,
    created_by_name character varying(100),
    created_by_role character varying(50)
);


ALTER TABLE public.recipe_consumptions OWNER TO postgres;

--
-- Name: recipe_consumptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipe_consumptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipe_consumptions_id_seq OWNER TO postgres;

--
-- Name: recipe_consumptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipe_consumptions_id_seq OWNED BY public.recipe_consumptions.id;


--
-- Name: recipe_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_items (
    id integer NOT NULL,
    recipe_id integer NOT NULL,
    raw_material_id integer NOT NULL,
    quantity_required double precision NOT NULL,
    notes text,
    sort_order integer,
    created_at timestamp without time zone
);


ALTER TABLE public.recipe_items OWNER TO postgres;

--
-- Name: recipe_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipe_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipe_items_id_seq OWNER TO postgres;

--
-- Name: recipe_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipe_items_id_seq OWNED BY public.recipe_items.id;


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipes (
    id integer NOT NULL,
    business_id integer NOT NULL,
    product_id integer NOT NULL,
    name character varying(255) NOT NULL,
    notes text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.recipes OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipes_id_seq OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipes_id_seq OWNED BY public.recipes.id;


--
-- Name: recurring_expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_expenses (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    amount double precision NOT NULL,
    due_day integer NOT NULL,
    frequency character varying(20),
    next_due_date date,
    category character varying(100),
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    payment_flow character varying(20) DEFAULT 'cash'::character varying,
    creditor_name character varying(255)
);


ALTER TABLE public.recurring_expenses OWNER TO postgres;

--
-- Name: recurring_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recurring_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_expenses_id_seq OWNER TO postgres;

--
-- Name: recurring_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recurring_expenses_id_seq OWNED BY public.recurring_expenses.id;


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminders (
    id character varying(36) NOT NULL,
    business_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    priority character varying(20),
    due_date character varying(20),
    due_time character varying(20),
    tags json,
    status character varying(20),
    pinned boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by_user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    updated_by_user_id integer
);


ALTER TABLE public.reminders OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL,
    granted_at timestamp without time zone
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_system boolean,
    created_at timestamp without time zone,
    business_id integer
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    business_id integer NOT NULL,
    customer_id integer,
    sale_date date NOT NULL,
    items json NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision,
    total double precision NOT NULL,
    balance double precision,
    payment_method character varying(20),
    paid boolean,
    note text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    total_cost double precision DEFAULT 0,
    user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    updated_by_user_id integer,
    collected_amount double precision DEFAULT 0,
    treasury_account_id integer
);


ALTER TABLE public.sales OWNER TO postgres;

--
-- Name: sales_goal_viewers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_goal_viewers (
    sales_goal_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.sales_goal_viewers OWNER TO postgres;

--
-- Name: sales_goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_goals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    business_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    target_amount double precision NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(20),
    achieved_at timestamp without time zone,
    congrats_archived boolean,
    last_congrats_seen_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.sales_goals OWNER TO postgres;

--
-- Name: sales_goals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_goals_id_seq OWNER TO postgres;

--
-- Name: sales_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_goals_id_seq OWNED BY public.sales_goals.id;


--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_id_seq OWNER TO postgres;

--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    plan character varying(20) NOT NULL,
    amount double precision NOT NULL,
    currency character varying(10),
    payment_method character varying(20),
    payment_date timestamp without time zone,
    status character varying(20),
    transaction_id character varying(100),
    created_at timestamp without time zone
);


ALTER TABLE public.subscription_payments OWNER TO postgres;

--
-- Name: subscription_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_payments_id_seq OWNER TO postgres;

--
-- Name: subscription_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_payments_id_seq OWNED BY public.subscription_payments.id;


--
-- Name: summary_cache_states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.summary_cache_states (
    id integer NOT NULL,
    business_id integer NOT NULL,
    namespace character varying(32) NOT NULL,
    dirty boolean NOT NULL,
    dirty_since timestamp without time zone,
    last_dirty_at timestamp without time zone,
    dirty_start_date date,
    dirty_end_date date,
    last_rebuilt_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.summary_cache_states OWNER TO postgres;

--
-- Name: summary_cache_states_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.summary_cache_states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.summary_cache_states_id_seq OWNER TO postgres;

--
-- Name: summary_cache_states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.summary_cache_states_id_seq OWNED BY public.summary_cache_states.id;


--
-- Name: summary_daily_aggregates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.summary_daily_aggregates (
    id integer NOT NULL,
    business_id integer NOT NULL,
    summary_date date NOT NULL,
    sales_total double precision NOT NULL,
    sales_count integer NOT NULL,
    total_cost double precision NOT NULL,
    expenses_total double precision NOT NULL,
    expenses_count integer NOT NULL,
    payments_total double precision NOT NULL,
    cash_sales_total double precision NOT NULL,
    cash_sales_cost double precision NOT NULL,
    payments_realized_cost double precision NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.summary_daily_aggregates OWNER TO postgres;

--
-- Name: summary_daily_aggregates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.summary_daily_aggregates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.summary_daily_aggregates_id_seq OWNER TO postgres;

--
-- Name: summary_daily_aggregates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.summary_daily_aggregates_id_seq OWNED BY public.summary_daily_aggregates.id;


--
-- Name: supplier_payables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_payables (
    id integer NOT NULL,
    business_id integer NOT NULL,
    supplier_id integer NOT NULL,
    raw_purchase_id integer,
    amount_total double precision NOT NULL,
    amount_paid double precision NOT NULL,
    balance_due double precision NOT NULL,
    status character varying(20) NOT NULL,
    due_date date,
    notes text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.supplier_payables OWNER TO postgres;

--
-- Name: supplier_payables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_payables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_payables_id_seq OWNER TO postgres;

--
-- Name: supplier_payables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_payables_id_seq OWNED BY public.supplier_payables.id;


--
-- Name: supplier_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_payments (
    id integer NOT NULL,
    business_id integer NOT NULL,
    supplier_id integer NOT NULL,
    supplier_payable_id integer NOT NULL,
    amount double precision NOT NULL,
    payment_date date NOT NULL,
    method character varying(50),
    reference character varying(255),
    notes text,
    created_by integer,
    created_at timestamp without time zone,
    created_by_name character varying(100),
    created_by_role character varying(50),
    treasury_account_id integer
);


ALTER TABLE public.supplier_payments OWNER TO postgres;

--
-- Name: supplier_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_payments_id_seq OWNER TO postgres;

--
-- Name: supplier_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_payments_id_seq OWNED BY public.supplier_payments.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    contact_name character varying(255),
    phone character varying(50),
    email character varying(255),
    notes text,
    is_active boolean,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: team_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_feedback (
    id integer NOT NULL,
    business_id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(20),
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    status character varying(20),
    created_at timestamp without time zone
);


ALTER TABLE public.team_feedback OWNER TO postgres;

--
-- Name: team_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_feedback_id_seq OWNER TO postgres;

--
-- Name: team_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_feedback_id_seq OWNED BY public.team_feedback.id;


--
-- Name: team_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_invitations (
    id integer NOT NULL,
    business_id integer NOT NULL,
    email character varying(255) NOT NULL,
    role_id integer NOT NULL,
    token character varying(100) NOT NULL,
    status character varying(20),
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone,
    invited_by integer,
    message_id character varying(100),
    delivery_status character varying(50),
    provider character varying(20),
    last_email_error text,
    send_attempts integer DEFAULT 0,
    last_sent_at timestamp without time zone
);


ALTER TABLE public.team_invitations OWNER TO postgres;

--
-- Name: team_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_invitations_id_seq OWNER TO postgres;

--
-- Name: team_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_invitations_id_seq OWNED BY public.team_invitations.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    business_id integer NOT NULL,
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    status character varying(20),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_id_seq OWNER TO postgres;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: treasury_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.treasury_accounts (
    id integer NOT NULL,
    business_id integer NOT NULL,
    name character varying(255) NOT NULL,
    account_type character varying(30) NOT NULL,
    payment_method_key character varying(50),
    currency character varying(10),
    opening_balance double precision NOT NULL,
    notes text,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


ALTER TABLE public.treasury_accounts OWNER TO postgres;

--
-- Name: treasury_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.treasury_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treasury_accounts_id_seq OWNER TO postgres;

--
-- Name: treasury_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.treasury_accounts_id_seq OWNED BY public.treasury_accounts.id;


--
-- Name: treasury_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.treasury_transfers (
    id integer NOT NULL,
    business_id integer NOT NULL,
    transfer_date date NOT NULL,
    origin_account_id integer NOT NULL,
    destination_account_id integer NOT NULL,
    amount double precision NOT NULL,
    note text,
    created_by_user_id integer,
    created_by_name character varying(100),
    created_by_role character varying(50),
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.treasury_transfers OWNER TO postgres;

--
-- Name: treasury_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.treasury_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.treasury_transfers_id_seq OWNER TO postgres;

--
-- Name: treasury_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.treasury_transfers_id_seq OWNED BY public.treasury_transfers.id;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role_id integer NOT NULL,
    assigned_at timestamp without time zone,
    assigned_by integer
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    plan character varying(20),
    is_admin boolean,
    email_verified boolean,
    email_verification_code character varying(20),
    email_verification_expires timestamp without time zone,
    reset_password_code character varying(20),
    reset_password_expires timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    last_login timestamp without time zone,
    is_active boolean,
    membership_plan character varying(20),
    membership_start timestamp without time zone,
    membership_end timestamp without time zone,
    membership_auto_renew boolean,
    wompi_payment_source_id character varying(100),
    wompi_payment_brand character varying(50),
    wompi_payment_last4 character varying(10),
    account_type character varying(20) DEFAULT 'personal'::character varying,
    linked_business_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: app_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings ALTER COLUMN id SET DEFAULT nextval('public.app_settings_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: banners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners ALTER COLUMN id SET DEFAULT nextval('public.banners_id_seq'::regclass);


--
-- Name: business_modules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_modules ALTER COLUMN id SET DEFAULT nextval('public.business_modules_id_seq'::regclass);


--
-- Name: business_profile id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_profile ALTER COLUMN id SET DEFAULT nextval('public.business_profile_id_seq'::regclass);


--
-- Name: businesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses ALTER COLUMN id SET DEFAULT nextval('public.businesses_id_seq'::regclass);


--
-- Name: client_sync_operations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sync_operations ALTER COLUMN id SET DEFAULT nextval('public.client_sync_operations_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: debt_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_payments ALTER COLUMN id SET DEFAULT nextval('public.debt_payments_id_seq'::regclass);


--
-- Name: debts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts ALTER COLUMN id SET DEFAULT nextval('public.debts_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: faqs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faqs ALTER COLUMN id SET DEFAULT nextval('public.faqs_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoice_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments ALTER COLUMN id SET DEFAULT nextval('public.invoice_payments_id_seq'::regclass);


--
-- Name: invoice_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings ALTER COLUMN id SET DEFAULT nextval('public.invoice_settings_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: ledger_allocations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_allocations ALTER COLUMN id SET DEFAULT nextval('public.ledger_allocations_id_seq'::regclass);


--
-- Name: ledger_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN id SET DEFAULT nextval('public.ledger_entries_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: product_barcodes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_barcodes ALTER COLUMN id SET DEFAULT nextval('public.product_barcodes_id_seq'::regclass);


--
-- Name: product_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_movements ALTER COLUMN id SET DEFAULT nextval('public.product_movements_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: quick_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_notes ALTER COLUMN id SET DEFAULT nextval('public.quick_notes_id_seq'::regclass);


--
-- Name: quote_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN id SET DEFAULT nextval('public.quote_items_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: raw_material_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements ALTER COLUMN id SET DEFAULT nextval('public.raw_material_movements_id_seq'::regclass);


--
-- Name: raw_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_materials ALTER COLUMN id SET DEFAULT nextval('public.raw_materials_id_seq'::regclass);


--
-- Name: raw_purchase_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchase_items ALTER COLUMN id SET DEFAULT nextval('public.raw_purchase_items_id_seq'::regclass);


--
-- Name: raw_purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases ALTER COLUMN id SET DEFAULT nextval('public.raw_purchases_id_seq'::regclass);


--
-- Name: recipe_consumption_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumption_items ALTER COLUMN id SET DEFAULT nextval('public.recipe_consumption_items_id_seq'::regclass);


--
-- Name: recipe_consumptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions ALTER COLUMN id SET DEFAULT nextval('public.recipe_consumptions_id_seq'::regclass);


--
-- Name: recipe_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_items ALTER COLUMN id SET DEFAULT nextval('public.recipe_items_id_seq'::regclass);


--
-- Name: recipes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes ALTER COLUMN id SET DEFAULT nextval('public.recipes_id_seq'::regclass);


--
-- Name: recurring_expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_expenses ALTER COLUMN id SET DEFAULT nextval('public.recurring_expenses_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: sales_goals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goals ALTER COLUMN id SET DEFAULT nextval('public.sales_goals_id_seq'::regclass);


--
-- Name: subscription_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments ALTER COLUMN id SET DEFAULT nextval('public.subscription_payments_id_seq'::regclass);


--
-- Name: summary_cache_states id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_cache_states ALTER COLUMN id SET DEFAULT nextval('public.summary_cache_states_id_seq'::regclass);


--
-- Name: summary_daily_aggregates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_daily_aggregates ALTER COLUMN id SET DEFAULT nextval('public.summary_daily_aggregates_id_seq'::regclass);


--
-- Name: supplier_payables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables ALTER COLUMN id SET DEFAULT nextval('public.supplier_payables_id_seq'::regclass);


--
-- Name: supplier_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments ALTER COLUMN id SET DEFAULT nextval('public.supplier_payments_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: team_feedback id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_feedback ALTER COLUMN id SET DEFAULT nextval('public.team_feedback_id_seq'::regclass);


--
-- Name: team_invitations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invitations ALTER COLUMN id SET DEFAULT nextval('public.team_invitations_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: treasury_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_accounts ALTER COLUMN id SET DEFAULT nextval('public.treasury_accounts_id_seq'::regclass);


--
-- Name: treasury_transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers ALTER COLUMN id SET DEFAULT nextval('public.treasury_transfers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
c1a9e7d52b31
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (id, key, value, updated_at) FROM stdin;
1	demo_preview_owner_id	2	2026-04-02 12:44:11.36363
2	demo_preview_business_id	1	2026-04-02 12:44:11.377362
5	demo_preview_session:3	{"active": true, "demo_business_id": 1, "updated_at": "2026-04-02T12:44:45.426636"}	2026-04-02 12:44:45.429112
6	demo_preview_session:5	{"active": true, "demo_business_id": 1, "updated_at": "2026-04-02T16:06:50.011552"}	2026-04-02 16:06:50.019829
7	auth_session_version:5	2	2026-04-02 16:06:52.522652
3	demo_preview_session:1	{"active": true, "demo_business_id": 1, "updated_at": "2026-04-02T16:22:08.066695"}	2026-04-02 16:22:08.071051
4	auth_session_version:1	3	2026-04-02 16:22:11.259129
8	auth_session_version:3	3	2026-04-02 17:27:32.047319
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent, "timestamp", business_id, actor_user_id, actor_member_id, actor_name, actor_role, module, entity_type, summary, metadata_json, before_json, after_json) FROM stdin;
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banners (id, title, image_url, link, active, "order", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: business_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_modules (id, business_id, module_key, enabled, config, created_at, updated_at) FROM stdin;
1	1	sales	t	null	2026-04-02 12:44:11.384481	2026-04-02 12:44:11.384485
2	1	customers	t	null	2026-04-02 12:44:11.384486	2026-04-02 12:44:11.384488
3	1	products	t	null	2026-04-02 12:44:11.384489	2026-04-02 12:44:11.38449
4	1	accounts_receivable	t	null	2026-04-02 12:44:11.384492	2026-04-02 12:44:11.384493
5	1	reports	t	null	2026-04-02 12:44:11.384494	2026-04-02 12:44:11.384495
6	1	quotes	t	null	2026-04-02 12:44:11.384497	2026-04-02 12:44:11.384498
7	1	raw_inventory	t	null	2026-04-02 12:44:11.3845	2026-04-02 12:44:11.384501
\.


--
-- Data for Name: business_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_profile (id, business_name, phone, tax_id, address, message, updated_at) FROM stdin;
1	Audit Probe	123	900	Calle 1	hola	2026-03-25T02:27:19.422441
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, user_id, name, currency, timezone, settings, created_at, updated_at, monthly_sales_goal, whatsapp_templates) FROM stdin;
1	2	Aurora Market Demo	COP	America/Bogota	{"debt_term_days": 21, "receivables_due_soon_days": 5, "personalization": {"commercial_sections": {"invoices": true, "orders": true, "sales_goals": true}}, "initial_setup": {"version": 1, "onboarding_profile": {"business_category": "simple_store", "inventory_mode": "catalog_with_stock", "sales_flow": "counter_and_whatsapp", "home_focus": "sales_and_cash", "team_mode": "owner_only", "documents_mode": "quotes_and_invoices", "operations_mode": "daily_control"}, "onboarding_completed": true, "onboarding_completed_at": "2026-04-02T17:27:31.755535", "initial_modules_applied": ["sales", "customers", "products", "accounts_receivable", "reports", "quotes", "raw_inventory"], "initial_home_focus": "sales_and_cash", "initial_dashboard_tab": "hoy", "recommended_tutorials": [], "simplicity_level": "guided", "highlighted_tools": ["Ventas", "Clientes", "Productos", "Cobros", "Reportes"], "hidden_tools": []}}	2026-04-02 12:44:11.37124	2026-04-02 17:27:31.756873	18500000	{"sale_message": "Hola {customer_name}, te compartimos el resumen de tu compra en Aurora Market Demo.", "collection_message": "Hola {customer_name}, este es un recordatorio amistoso de tu saldo pendiente en Aurora Market Demo."}
\.


--
-- Data for Name: client_sync_operations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_sync_operations (id, business_id, user_id, client_operation_id, entity_type, action, status, entity_id, response_status, response_payload, error_message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customers (id, business_id, name, phone, address, notes, active, created_at, updated_at, created_by_user_id, created_by_name, created_by_role, updated_by_user_id) FROM stdin;
1	1	Ana Gomez	3001234567	Cra 9 #74-20	Compra semanal para oficina.	t	2026-04-02 12:44:11.434583	2026-04-02 12:44:11.4346	\N	Demo	Vista previa	\N
2	1	Carlos Ruiz	3015559081	Cl 45 #18-22	Cliente fiel de desayunos.	t	2026-04-02 12:44:11.437696	2026-04-02 12:44:11.437701	\N	Demo	Vista previa	\N
3	1	Studio Norte	3208891144	Parque de la 93	Empresa que compra coffee breaks.	t	2026-04-02 12:44:11.440539	2026-04-02 12:44:11.440545	\N	Demo	Vista previa	\N
4	1	Laura Mendoza	3157001133	Cl 120 #7-18	Prefiere pedidos por WhatsApp.	t	2026-04-02 12:44:11.443117	2026-04-02 12:44:11.443121	\N	Demo	Vista previa	\N
5	1	Restaurante La Plaza	3182224455	Zona G	Compra cafe en grano y postres.	t	2026-04-02 12:44:11.445271	2026-04-02 12:44:11.445275	\N	Demo	Vista previa	\N
\.


--
-- Data for Name: debt_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.debt_payments (id, debt_id, amount, payment_date, payment_method, note, created_at, treasury_account_id) FROM stdin;
1	1	466000	2026-03-12	transfer	Abono demo registrado para mostrar seguimiento.	2026-04-02 12:44:11.614663	2
\.


--
-- Data for Name: debts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.debts (id, business_id, name, creditor_name, category, total_amount, balance_due, start_date, due_date, frequency, interest_rate, installments, estimated_installment, status, notes, reminder_enabled, created_at, updated_at, origin_type, recurring_expense_id, generated_from_due_date) FROM stdin;
1	1	Credito horno industrial	Banco Aliado	Prestamos	6800000	2140000	2025-12-03	2026-04-11	monthly	\N	12	580000	partial	Financia ampliacion de linea premium.	t	2026-04-02 12:44:11.605011	2026-04-02 12:44:11.605016	manual	\N	\N
2	1	Cuenta proveedor empaques	Pack&Go SAS	Proveedores	1240000	1240000	2025-12-03	2026-04-06	monthly	\N	12	1240000	pending	Pago pendiente de vasos y sleeves compostables.	t	2026-04-02 12:44:11.618583	2026-04-02 12:44:11.618586	manual	\N	\N
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, business_id, expense_date, category, amount, description, created_at, updated_at, created_by_user_id, created_by_name, created_by_role, updated_by_user_id, source_type, payment_method, recurring_expense_id, debt_id, debt_payment_id, raw_purchase_id, supplier_payable_id, supplier_payment_id, treasury_account_id) FROM stdin;
1	1	2026-04-01	Nomina	420000	Pago turno tarde baristas	2026-04-02 12:44:11.552398	2026-04-02 12:44:11.552406	\N	Demo	Vista previa	\N	manual	transfer	\N	\N	\N	\N	\N	\N	2
2	1	2026-03-31	Servicios	165000	Energia y agua del local	2026-04-02 12:44:11.560515	2026-04-02 12:44:11.560519	\N	Demo	Vista previa	\N	manual	transfer	\N	\N	\N	\N	\N	\N	2
3	1	2026-03-29	Marketing	98000	Campana de Instagram weekend brunch	2026-04-02 12:44:11.565151	2026-04-02 12:44:11.565155	\N	Demo	Vista previa	\N	manual	nequi	\N	\N	\N	\N	\N	\N	3
4	1	2026-03-27	Insumos	248000	Compra adicional de leche y frutas	2026-04-02 12:44:11.568722	2026-04-02 12:44:11.568726	\N	Demo	Vista previa	\N	manual	cash	\N	\N	\N	\N	\N	\N	1
5	1	2026-03-23	Arriendo	2500000	Canon mensual local principal	2026-04-02 12:44:11.573874	2026-04-02 12:44:11.573881	\N	Demo	Vista previa	\N	manual	transfer	\N	\N	\N	\N	\N	\N	2
\.


--
-- Data for Name: faqs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faqs (id, question, answer, active, "order", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, line_total, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoice_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_payments (id, invoice_id, amount, payment_date, payment_method, note, created_by, created_at, treasury_account_id, event_type, source_payment_id) FROM stdin;
\.


--
-- Data for Name: invoice_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_settings (id, business_id, prefix, logo_url, brand_color, accent_color, footer_text, default_notes, default_terms, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, business_id, customer_id, invoice_number, status, issue_date, due_date, currency, subtotal, discount_total, tax_total, total, notes, payment_method, created_by, sent_at, paid_at, cancelled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ledger_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_allocations (id, payment_id, charge_id, amount, created_at) FROM stdin;
\.


--
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, business_id, customer_id, entry_type, amount, entry_date, note, ref_type, ref_id, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, business_id, customer_id, order_number, status, items, subtotal, discount, total, notes, order_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, business_id, customer_id, sale_id, payment_date, amount, method, note, created_at, created_by_user_id, created_by_name, created_by_role, updated_by_user_id, treasury_account_id, updated_at) FROM stdin;
1	1	1	1	2026-04-01	30100	cash	Abono inicial Demo morning combo	2026-04-02 12:44:11.466648	\N	Demo	Vista previa	\N	1	2026-04-02 12:44:11.466657
2	1	2	2	2026-03-31	11500	transfer	Abono inicial Demo afternoon visit	2026-04-02 12:44:11.47866	\N	Demo	Vista previa	\N	3	2026-04-02 12:44:11.478665
3	1	4	3	2026-03-30	18000	transfer	Abono inicial Demo pending brunch	2026-04-02 12:44:11.487299	\N	Demo	Vista previa	\N	2	2026-04-02 12:44:11.487305
4	1	5	4	2026-03-28	28500	transfer	Abono inicial Demo wholesale beans	2026-04-02 12:44:11.498274	\N	Demo	Vista previa	\N	2	2026-04-02 12:44:11.498278
5	1	3	5	2026-03-26	90000	transfer	Abono inicial Demo corporate coffee break	2026-04-02 12:44:11.508456	\N	Demo	Vista previa	\N	2	2026-04-02 12:44:11.50846
6	1	1	7	2026-03-21	26000	cash	Abono inicial Demo second office order	2026-04-02 12:44:11.522979	\N	Demo	Vista previa	\N	1	2026-04-02 12:44:11.522986
7	1	2	8	2026-03-19	5000	transfer	Abono inicial Demo pending sweets	2026-04-02 12:44:11.532518	\N	Demo	Vista previa	\N	3	2026-04-02 12:44:11.532522
8	1	3	9	2026-03-15	57000	transfer	Abono inicial Demo recurring office restock	2026-04-02 12:44:11.542197	\N	Demo	Vista previa	\N	2	2026-04-02 12:44:11.542201
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name, description, category, created_at, scope) FROM stdin;
\.


--
-- Data for Name: product_barcodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_barcodes (id, product_id, code, created_at) FROM stdin;
\.


--
-- Data for Name: product_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_movements (id, product_id, business_id, user_id, type, quantity, reason, created_at, created_by_name, created_by_role) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, business_id, name, sku, price, cost, unit, stock, low_stock_threshold, active, created_at, updated_at, type, description, image, fulfillment_mode) FROM stdin;
1	1	Latte vainilla	LATTE	13000	5200	und	38	8	t	2026-04-02 12:44:11.41066	2026-04-02 12:44:11.410678	product	Cafe especial con leche cremosa.	\N	\N
2	1	Cappuccino doble	CAPPU	11500	4300	und	41	8	t	2026-04-02 12:44:11.414396	2026-04-02 12:44:11.4144	product	Bebida estrella de la manana.	\N	\N
3	1	Croissant mantequilla	CROI	7900	2800	und	16	6	t	2026-04-02 12:44:11.416153	2026-04-02 12:44:11.416156	product	Acompana desayunos y combos.	\N	\N
4	1	Sandwich pavo y queso	SAND	16800	7200	und	12	5	t	2026-04-02 12:44:11.41812	2026-04-02 12:44:11.418123	product	Ideal para almuerzo rapido.	\N	\N
5	1	Bowl de frutas premium	BOWL	14900	6100	und	9	4	t	2026-04-02 12:44:11.420266	2026-04-02 12:44:11.420269	product	Opcion fresca y saludable.	\N	\N
6	1	Torta de chocolate	POST	9200	3100	und	14	5	t	2026-04-02 12:44:11.42324	2026-04-02 12:44:11.423246	product	Alta rotacion en tardes.	\N	\N
7	1	Cafe en grano 340g	GRANO	28500	13200	und	22	6	t	2026-04-02 12:44:11.426286	2026-04-02 12:44:11.42629	product	Ticket alto para venta retail.	\N	\N
8	1	Servicio coffee break	CATER	180000	72000	serv	0	0	t	2026-04-02 12:44:11.428279	2026-04-02 12:44:11.428284	service	Servicio empresarial recurrente.	\N	\N
\.


--
-- Data for Name: quick_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quick_notes (id, business_id, note, created_at) FROM stdin;
\.


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_items (id, quote_id, product_id, description, quantity, unit_price, subtotal, sort_order, created_at, updated_at, fulfillment_mode) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotes (id, business_id, customer_id, quote_code, status, issue_date, expiry_date, subtotal, discount, total, notes, terms, created_by, converted_sale_id, converted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: raw_material_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raw_material_movements (id, raw_material_id, business_id, created_by, movement_type, quantity, previous_stock, new_stock, reference_cost, notes, created_at, created_by_name, created_by_role, raw_purchase_id, recipe_consumption_id) FROM stdin;
\.


--
-- Data for Name: raw_materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raw_materials (id, business_id, name, sku, unit, current_stock, minimum_stock, reference_cost, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: raw_purchase_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raw_purchase_items (id, raw_purchase_id, raw_material_id, description, quantity, unit_cost, subtotal, created_at) FROM stdin;
\.


--
-- Data for Name: raw_purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raw_purchases (id, business_id, supplier_id, purchase_number, status, purchase_date, subtotal, total, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recipe_consumption_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_consumption_items (id, recipe_consumption_id, raw_material_id, quantity_consumed, previous_stock, new_stock, raw_material_movement_id, created_at) FROM stdin;
\.


--
-- Data for Name: recipe_consumptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_consumptions (id, business_id, recipe_id, product_id, related_sale_id, quantity_produced_or_sold, notes, created_by, created_at, created_by_name, created_by_role) FROM stdin;
\.


--
-- Data for Name: recipe_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_items (id, recipe_id, raw_material_id, quantity_required, notes, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipes (id, business_id, product_id, name, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recurring_expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recurring_expenses (id, business_id, name, amount, due_day, frequency, next_due_date, category, is_active, created_at, updated_at, payment_flow, creditor_name) FROM stdin;
\.


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reminders (id, business_id, title, content, priority, due_date, due_time, tags, status, pinned, created_at, updated_at, created_by_user_id, created_by_name, created_by_role, updated_by_user_id) FROM stdin;
55fd0e51-9bbf-45aa-94e4-c966bc1e8e12	1	Confirmar pedido Studio Norte	Revisar si el cliente amplia el coffee break del jueves.	high	2026-04-03	09:00	["demo", "preview"]	active	t	2026-04-02 12:44:11.581082	2026-04-02 12:44:11.581086	\N	Demo	Vista previa	\N
fc2f5565-c8f6-4596-919e-2dc75b73159c	1	Revisar stock de croissants	El producto rota rapido en la tarde; validar reposicion.	medium	2026-04-04	09:00	["demo", "preview"]	active	f	2026-04-02 12:44:11.584937	2026-04-02 12:44:11.584941	\N	Demo	Vista previa	\N
b261e420-8014-4b7e-9c71-7b68ce2815bc	1	Actualizar promocion de cafe en grano	Medir si el bundle con postre mejora ticket promedio.	medium	2026-04-06	09:00	["demo", "preview"]	active	f	2026-04-02 12:44:11.590092	2026-04-02 12:44:11.590099	\N	Demo	Vista previa	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id, granted_at) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, description, is_system, created_at, business_id) FROM stdin;
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales (id, business_id, customer_id, sale_date, items, subtotal, discount, total, balance, payment_method, paid, note, created_at, updated_at, total_cost, user_id, created_by_name, created_by_role, updated_by_user_id, collected_amount, treasury_account_id) FROM stdin;
1	1	1	2026-04-01	[{"product_id": 1, "name": "Latte vainilla", "qty": 1.0, "unit_price": 13000.0, "total": 13000.0, "cost_total": 5200.0}, {"product_id": 3, "name": "Croissant mantequilla", "qty": 1.0, "unit_price": 7900.0, "total": 7900.0, "cost_total": 2800.0}, {"product_id": 6, "name": "Torta de chocolate", "qty": 1.0, "unit_price": 9200.0, "total": 9200.0, "cost_total": 3100.0}]	30100	0	30100	0	cash	t	Demo morning combo	2026-04-02 12:44:11.454994	2026-04-02 12:44:11.455003	11100	2	Demo	Vista previa	\N	30100	1
2	1	2	2026-03-31	[{"product_id": 2, "name": "Cappuccino doble", "qty": 1.0, "unit_price": 11500.0, "total": 11500.0, "cost_total": 4300.0}]	11500	0	11500	0	transfer	t	Demo afternoon visit	2026-04-02 12:44:11.473663	2026-04-02 12:44:11.473668	4300	2	Demo	Vista previa	\N	11500	3
3	1	4	2026-03-30	[{"product_id": 4, "name": "Sandwich pavo y queso", "qty": 1.0, "unit_price": 16800.0, "total": 16800.0, "cost_total": 7200.0}, {"product_id": 5, "name": "Bowl de frutas premium", "qty": 1.0, "unit_price": 14900.0, "total": 14900.0, "cost_total": 6100.0}]	31700	0	31700	13700	credit	f	Demo pending brunch	2026-04-02 12:44:11.483015	2026-04-02 12:44:11.483018	13300	2	Demo	Vista previa	\N	18000	2
4	1	5	2026-03-28	[{"product_id": 7, "name": "Cafe en grano 340g", "qty": 1.0, "unit_price": 28500.0, "total": 28500.0, "cost_total": 13200.0}]	28500	0	28500	0	transfer	t	Demo wholesale beans	2026-04-02 12:44:11.493087	2026-04-02 12:44:11.493091	13200	2	Demo	Vista previa	\N	28500	2
5	1	3	2026-03-26	[{"product_id": 8, "name": "Servicio coffee break", "qty": 1.0, "unit_price": 180000.0, "total": 180000.0, "cost_total": 72000.0}]	180000	0	180000	90000	credit	f	Demo corporate coffee break	2026-04-02 12:44:11.502556	2026-04-02 12:44:11.50256	72000	2	Demo	Vista previa	\N	90000	2
6	1	\N	2026-03-24	[{"product_id": 1, "name": "Latte vainilla", "qty": 1.0, "unit_price": 13000.0, "total": 13000.0, "cost_total": 5200.0}, {"product_id": 2, "name": "Cappuccino doble", "qty": 1.0, "unit_price": 11500.0, "total": 11500.0, "cost_total": 4300.0}, {"product_id": 3, "name": "Croissant mantequilla", "qty": 1.0, "unit_price": 7900.0, "total": 7900.0, "cost_total": 2800.0}]	32400	0	32400	0	cash	t	Demo walk-in breakfast	2026-04-02 12:44:11.51388	2026-04-02 12:44:11.513884	12300	2	Demo	Vista previa	\N	32400	1
7	1	1	2026-03-21	[{"product_id": 4, "name": "Sandwich pavo y queso", "qty": 1.0, "unit_price": 16800.0, "total": 16800.0, "cost_total": 7200.0}, {"product_id": 6, "name": "Torta de chocolate", "qty": 1.0, "unit_price": 9200.0, "total": 9200.0, "cost_total": 3100.0}]	26000	0	26000	0	cash	t	Demo second office order	2026-04-02 12:44:11.51763	2026-04-02 12:44:11.517633	10300	2	Demo	Vista previa	\N	26000	1
8	1	2	2026-03-19	[{"product_id": 6, "name": "Torta de chocolate", "qty": 2.0, "unit_price": 9200.0, "total": 18400.0, "cost_total": 6200.0}, {"product_id": 2, "name": "Cappuccino doble", "qty": 1.0, "unit_price": 11500.0, "total": 11500.0, "cost_total": 4300.0}]	29900	0	29900	24900	credit	f	Demo pending sweets	2026-04-02 12:44:11.528198	2026-04-02 12:44:11.528203	10500	2	Demo	Vista previa	\N	5000	3
9	1	3	2026-03-15	[{"product_id": 7, "name": "Cafe en grano 340g", "qty": 2.0, "unit_price": 28500.0, "total": 57000.0, "cost_total": 26400.0}]	57000	0	57000	0	transfer	t	Demo recurring office restock	2026-04-02 12:44:11.535945	2026-04-02 12:44:11.53595	26400	2	Demo	Vista previa	\N	57000	2
\.


--
-- Data for Name: sales_goal_viewers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_goal_viewers (sales_goal_id, user_id) FROM stdin;
\.


--
-- Data for Name: sales_goals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sales_goals (id, user_id, business_id, title, description, target_amount, start_date, end_date, status, achieved_at, congrats_archived, last_congrats_seen_at, created_at, updated_at) FROM stdin;
1	2	1	Meta mensual demo	Mantener ritmo de ventas y mejorar ticket promedio del canal corporativo.	18500000	2026-04-01	2026-04-30	active	\N	f	\N	2026-04-02 12:44:11.598033	2026-04-02 12:44:11.598037
\.


--
-- Data for Name: subscription_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_payments (id, user_id, plan, amount, currency, payment_method, payment_date, status, transaction_id, created_at) FROM stdin;
\.


--
-- Data for Name: summary_cache_states; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.summary_cache_states (id, business_id, namespace, dirty, dirty_since, last_dirty_at, dirty_start_date, dirty_end_date, last_rebuilt_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: summary_daily_aggregates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.summary_daily_aggregates (id, business_id, summary_date, sales_total, sales_count, total_cost, expenses_total, expenses_count, payments_total, cash_sales_total, cash_sales_cost, payments_realized_cost, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: supplier_payables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_payables (id, business_id, supplier_id, raw_purchase_id, amount_total, amount_paid, balance_due, status, due_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: supplier_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_payments (id, business_id, supplier_id, supplier_payable_id, amount, payment_date, method, reference, notes, created_by, created_at, created_by_name, created_by_role, treasury_account_id) FROM stdin;
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, business_id, name, contact_name, phone, email, notes, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_feedback (id, business_id, user_id, type, subject, message, status, created_at) FROM stdin;
\.


--
-- Data for Name: team_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_invitations (id, business_id, email, role_id, token, status, expires_at, created_at, invited_by, message_id, delivery_status, provider, last_email_error, send_attempts, last_sent_at) FROM stdin;
\.


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_members (id, business_id, user_id, role_id, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: treasury_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treasury_accounts (id, business_id, name, account_type, payment_method_key, currency, opening_balance, notes, is_active, created_at, updated_at, is_default) FROM stdin;
1	1	Caja principal	cash	cash	COP	1250000	Cuenta de demostracion para vista previa.	t	2026-04-02 12:44:11.398137	2026-04-02 12:44:11.398144	t
2	1	Bancolombia negocios	bank	transfer	COP	4800000	Cuenta de demostracion para vista previa.	t	2026-04-02 12:44:11.401167	2026-04-02 12:44:11.40117	f
3	1	Billetera Nequi	wallet	nequi	COP	740000	Cuenta de demostracion para vista previa.	t	2026-04-02 12:44:11.403338	2026-04-02 12:44:11.403342	f
\.


--
-- Data for Name: treasury_transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.treasury_transfers (id, business_id, transfer_date, origin_account_id, destination_account_id, amount, note, created_by_user_id, created_by_name, created_by_role, created_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id, assigned_at, assigned_by) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, plan, is_admin, email_verified, email_verification_code, email_verification_expires, reset_password_code, reset_password_expires, created_at, updated_at, last_login, is_active, membership_plan, membership_start, membership_end, membership_auto_renew, wompi_payment_source_id, wompi_payment_brand, wompi_payment_last4, account_type, linked_business_id) FROM stdin;
2	demo-preview@encaja.local	$2b$12$wWzEKOjXSwNC9Fyr86uKD.wGuQaD2XtNrlEywA8lVJRTFcrHGMXy6	Equipo Demo EnCaja	business	f	t	\N	\N	\N	\N	2026-04-02 12:44:11.358014	2026-04-02 12:44:11.358018	\N	t	business_manual	2026-04-02 12:44:11.072852	2036-03-30 12:44:11.072856	f	\N	\N	\N	personal	\N
4	invalid@example.com	$2b$12$tnZnWNdpFnbIjZdrqtfai.n2W706hZrjmxMGUCe5Judk6qOPocJUW	Invalid	free	f	t	\N	\N	\N	\N	2026-04-02 13:45:23.807759	2026-04-02 13:45:24.178406	2026-04-02 13:45:24.176165	t	\N	\N	\N	t	\N	\N	\N	personal	\N
5	tunuevasenda@gmail.com	$2b$12$iz.PivfpTy0S/M/fDwLequ/zDIngx6FblI9PtmQQbx9koP7/Mpw.O	Tunuevasenda	free	f	t	\N	\N	\N	\N	2026-04-02 13:46:12.312476	2026-04-02 16:06:44.605385	2026-04-02 16:06:44.604481	t	\N	\N	\N	t	\N	\N	\N	personal	\N
1	encajapp45@gmail.com	$2b$12$ge0Wq60ZSt3irqBs4Qri7.M7OuH2hrJE6s/pOIM0DoBA8t/3Uy4jy	Encajapp45	free	f	t	\N	\N	\N	\N	2026-04-02 12:44:07.896096	2026-04-02 16:27:08.409982	2026-04-02 16:27:08.407744	t	\N	\N	\N	t	\N	\N	\N	personal	\N
3	demo@cuaderno.app	$2b$12$RnTPgXvoF16m4V71Sn64zuYGwPQ9wX.IQGnG8FARVoPMwYYAGzArK	Demo	free	f	t	\N	\N	\N	\N	2026-04-02 12:44:39.517801	2026-04-02 17:27:31.297952	2026-04-02 17:27:31.297169	t	\N	\N	\N	t	\N	\N	\N	personal	\N
\.


--
-- Name: app_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_settings_id_seq', 8, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- Name: banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.banners_id_seq', 1, false);


--
-- Name: business_modules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_modules_id_seq', 7, true);


--
-- Name: business_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_profile_id_seq', 1, false);


--
-- Name: businesses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.businesses_id_seq', 1, true);


--
-- Name: client_sync_operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_sync_operations_id_seq', 1, false);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.customers_id_seq', 5, true);


--
-- Name: debt_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.debt_payments_id_seq', 1, true);


--
-- Name: debts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.debts_id_seq', 2, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenses_id_seq', 5, true);


--
-- Name: faqs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.faqs_id_seq', 1, false);


--
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 1, false);


--
-- Name: invoice_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_payments_id_seq', 1, false);


--
-- Name: invoice_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_settings_id_seq', 1, false);


--
-- Name: invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoices_id_seq', 1, false);


--
-- Name: ledger_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledger_allocations_id_seq', 1, false);


--
-- Name: ledger_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ledger_entries_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 8, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 1, false);


--
-- Name: product_barcodes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_barcodes_id_seq', 1, false);


--
-- Name: product_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_movements_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 8, true);


--
-- Name: quick_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quick_notes_id_seq', 1, false);


--
-- Name: quote_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quote_items_id_seq', 1, false);


--
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quotes_id_seq', 1, false);


--
-- Name: raw_material_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raw_material_movements_id_seq', 1, false);


--
-- Name: raw_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raw_materials_id_seq', 1, false);


--
-- Name: raw_purchase_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raw_purchase_items_id_seq', 1, false);


--
-- Name: raw_purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raw_purchases_id_seq', 1, false);


--
-- Name: recipe_consumption_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipe_consumption_items_id_seq', 1, false);


--
-- Name: recipe_consumptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipe_consumptions_id_seq', 1, false);


--
-- Name: recipe_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipe_items_id_seq', 1, false);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipes_id_seq', 1, false);


--
-- Name: recurring_expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recurring_expenses_id_seq', 1, false);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: sales_goals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_goals_id_seq', 1, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sales_id_seq', 9, true);


--
-- Name: subscription_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subscription_payments_id_seq', 1, false);


--
-- Name: summary_cache_states_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.summary_cache_states_id_seq', 1, false);


--
-- Name: summary_daily_aggregates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.summary_daily_aggregates_id_seq', 1, false);


--
-- Name: supplier_payables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_payables_id_seq', 1, false);


--
-- Name: supplier_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_payments_id_seq', 1, false);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 1, false);


--
-- Name: team_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.team_feedback_id_seq', 1, false);


--
-- Name: team_invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.team_invitations_id_seq', 1, false);


--
-- Name: team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.team_members_id_seq', 1, false);


--
-- Name: treasury_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.treasury_accounts_id_seq', 3, true);


--
-- Name: treasury_transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.treasury_transfers_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: business_modules business_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_modules
    ADD CONSTRAINT business_modules_pkey PRIMARY KEY (id);


--
-- Name: business_profile business_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_profile
    ADD CONSTRAINT business_profile_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: client_sync_operations client_sync_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sync_operations
    ADD CONSTRAINT client_sync_operations_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: debt_payments debt_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_payments
    ADD CONSTRAINT debt_payments_pkey PRIMARY KEY (id);


--
-- Name: debts debts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: faqs faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faqs
    ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_payments invoice_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_pkey PRIMARY KEY (id);


--
-- Name: invoice_settings invoice_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT invoice_settings_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: ledger_allocations ledger_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_allocations
    ADD CONSTRAINT ledger_allocations_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: product_barcodes product_barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_barcodes
    ADD CONSTRAINT product_barcodes_pkey PRIMARY KEY (id);


--
-- Name: product_movements product_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_movements
    ADD CONSTRAINT product_movements_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: quick_notes quick_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_notes
    ADD CONSTRAINT quick_notes_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: raw_material_movements raw_material_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_pkey PRIMARY KEY (id);


--
-- Name: raw_materials raw_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_pkey PRIMARY KEY (id);


--
-- Name: raw_purchase_items raw_purchase_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchase_items
    ADD CONSTRAINT raw_purchase_items_pkey PRIMARY KEY (id);


--
-- Name: raw_purchases raw_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases
    ADD CONSTRAINT raw_purchases_pkey PRIMARY KEY (id);


--
-- Name: recipe_consumption_items recipe_consumption_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumption_items
    ADD CONSTRAINT recipe_consumption_items_pkey PRIMARY KEY (id);


--
-- Name: recipe_consumptions recipe_consumptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_pkey PRIMARY KEY (id);


--
-- Name: recipe_items recipe_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_items
    ADD CONSTRAINT recipe_items_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: recurring_expenses recurring_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sales_goal_viewers sales_goal_viewers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goal_viewers
    ADD CONSTRAINT sales_goal_viewers_pkey PRIMARY KEY (sales_goal_id, user_id);


--
-- Name: sales_goals sales_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goals
    ADD CONSTRAINT sales_goals_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: summary_cache_states summary_cache_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_cache_states
    ADD CONSTRAINT summary_cache_states_pkey PRIMARY KEY (id);


--
-- Name: summary_daily_aggregates summary_daily_aggregates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_daily_aggregates
    ADD CONSTRAINT summary_daily_aggregates_pkey PRIMARY KEY (id);


--
-- Name: supplier_payables supplier_payables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables
    ADD CONSTRAINT supplier_payables_pkey PRIMARY KEY (id);


--
-- Name: supplier_payments supplier_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: team_feedback team_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_feedback
    ADD CONSTRAINT team_feedback_pkey PRIMARY KEY (id);


--
-- Name: team_invitations team_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: treasury_accounts treasury_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_accounts
    ADD CONSTRAINT treasury_accounts_pkey PRIMARY KEY (id);


--
-- Name: treasury_transfers treasury_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers
    ADD CONSTRAINT treasury_transfers_pkey PRIMARY KEY (id);


--
-- Name: business_modules uq_business_modules_business_module_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_modules
    ADD CONSTRAINT uq_business_modules_business_module_key UNIQUE (business_id, module_key);


--
-- Name: client_sync_operations uq_client_sync_operation_scope; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sync_operations
    ADD CONSTRAINT uq_client_sync_operation_scope UNIQUE (business_id, user_id, client_operation_id);


--
-- Name: invoice_settings uq_invoice_settings_business; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT uq_invoice_settings_business UNIQUE (business_id);


--
-- Name: invoices uq_invoices_business_invoice_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT uq_invoices_business_invoice_number UNIQUE (business_id, invoice_number);


--
-- Name: quotes uq_quotes_business_quote_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT uq_quotes_business_quote_code UNIQUE (business_id, quote_code);


--
-- Name: raw_purchases uq_raw_purchases_business_purchase_number; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases
    ADD CONSTRAINT uq_raw_purchases_business_purchase_number UNIQUE (business_id, purchase_number);


--
-- Name: summary_cache_states uq_summary_cache_states_business_namespace; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_cache_states
    ADD CONSTRAINT uq_summary_cache_states_business_namespace UNIQUE (business_id, namespace);


--
-- Name: summary_daily_aggregates uq_summary_daily_aggregates_business_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_daily_aggregates
    ADD CONSTRAINT uq_summary_daily_aggregates_business_date UNIQUE (business_id, summary_date);


--
-- Name: supplier_payables uq_supplier_payables_raw_purchase_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables
    ADD CONSTRAINT uq_supplier_payables_raw_purchase_id UNIQUE (raw_purchase_id);


--
-- Name: treasury_accounts uq_treasury_accounts_business_payment_method_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_accounts
    ADD CONSTRAINT uq_treasury_accounts_business_payment_method_key UNIQUE (business_id, payment_method_key);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_app_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_app_settings_key ON public.app_settings USING btree (key);


--
-- Name: ix_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: ix_audit_logs_actor_member_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_actor_member_id ON public.audit_logs USING btree (actor_member_id);


--
-- Name: ix_audit_logs_actor_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_actor_user_id ON public.audit_logs USING btree (actor_user_id);


--
-- Name: ix_audit_logs_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_business_id ON public.audit_logs USING btree (business_id);


--
-- Name: ix_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_entity ON public.audit_logs USING btree (entity);


--
-- Name: ix_audit_logs_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_entity_id ON public.audit_logs USING btree (entity_id);


--
-- Name: ix_audit_logs_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_entity_type ON public.audit_logs USING btree (entity_type);


--
-- Name: ix_audit_logs_module; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_module ON public.audit_logs USING btree (module);


--
-- Name: ix_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: ix_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: ix_business_modules_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_business_modules_business_id ON public.business_modules USING btree (business_id);


--
-- Name: ix_business_modules_module_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_business_modules_module_key ON public.business_modules USING btree (module_key);


--
-- Name: ix_businesses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_businesses_user_id ON public.businesses USING btree (user_id);


--
-- Name: ix_client_sync_operations_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_action ON public.client_sync_operations USING btree (action);


--
-- Name: ix_client_sync_operations_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_business_id ON public.client_sync_operations USING btree (business_id);


--
-- Name: ix_client_sync_operations_client_operation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_client_operation_id ON public.client_sync_operations USING btree (client_operation_id);


--
-- Name: ix_client_sync_operations_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_created_at ON public.client_sync_operations USING btree (created_at);


--
-- Name: ix_client_sync_operations_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_entity_id ON public.client_sync_operations USING btree (entity_id);


--
-- Name: ix_client_sync_operations_entity_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_entity_type ON public.client_sync_operations USING btree (entity_type);


--
-- Name: ix_client_sync_operations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_status ON public.client_sync_operations USING btree (status);


--
-- Name: ix_client_sync_operations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_client_sync_operations_user_id ON public.client_sync_operations USING btree (user_id);


--
-- Name: ix_customers_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_customers_business_id ON public.customers USING btree (business_id);


--
-- Name: ix_debt_payments_debt_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_debt_payments_debt_id ON public.debt_payments USING btree (debt_id);


--
-- Name: ix_debt_payments_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_debt_payments_treasury_account_id ON public.debt_payments USING btree (treasury_account_id);


--
-- Name: ix_debts_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_debts_business_id ON public.debts USING btree (business_id);


--
-- Name: ix_debts_recurring_expense_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_debts_recurring_expense_id ON public.debts USING btree (recurring_expense_id);


--
-- Name: ix_expenses_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_business_id ON public.expenses USING btree (business_id);


--
-- Name: ix_expenses_business_id_expense_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_business_id_expense_date ON public.expenses USING btree (business_id, expense_date);


--
-- Name: ix_expenses_debt_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_debt_id ON public.expenses USING btree (debt_id);


--
-- Name: ix_expenses_debt_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_debt_payment_id ON public.expenses USING btree (debt_payment_id);


--
-- Name: ix_expenses_raw_purchase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_raw_purchase_id ON public.expenses USING btree (raw_purchase_id);


--
-- Name: ix_expenses_recurring_expense_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_recurring_expense_id ON public.expenses USING btree (recurring_expense_id);


--
-- Name: ix_expenses_supplier_payable_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_supplier_payable_id ON public.expenses USING btree (supplier_payable_id);


--
-- Name: ix_expenses_supplier_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_supplier_payment_id ON public.expenses USING btree (supplier_payment_id);


--
-- Name: ix_expenses_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_expenses_treasury_account_id ON public.expenses USING btree (treasury_account_id);


--
-- Name: ix_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: ix_invoice_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_items_product_id ON public.invoice_items USING btree (product_id);


--
-- Name: ix_invoice_payments_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_created_by ON public.invoice_payments USING btree (created_by);


--
-- Name: ix_invoice_payments_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_invoice_id ON public.invoice_payments USING btree (invoice_id);


--
-- Name: ix_invoice_payments_invoice_id_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_invoice_id_payment_date ON public.invoice_payments USING btree (invoice_id, payment_date);


--
-- Name: ix_invoice_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_payment_date ON public.invoice_payments USING btree (payment_date);


--
-- Name: ix_invoice_payments_source_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_source_payment_id ON public.invoice_payments USING btree (source_payment_id);


--
-- Name: ix_invoice_payments_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_payments_treasury_account_id ON public.invoice_payments USING btree (treasury_account_id);


--
-- Name: ix_invoice_settings_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoice_settings_business_id ON public.invoice_settings USING btree (business_id);


--
-- Name: ix_invoices_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_business_id ON public.invoices USING btree (business_id);


--
-- Name: ix_invoices_business_id_issue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_business_id_issue_date ON public.invoices USING btree (business_id, issue_date);


--
-- Name: ix_invoices_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_created_by ON public.invoices USING btree (created_by);


--
-- Name: ix_invoices_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_customer_id ON public.invoices USING btree (customer_id);


--
-- Name: ix_invoices_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: ix_invoices_invoice_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_invoice_number ON public.invoices USING btree (invoice_number);


--
-- Name: ix_invoices_issue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_issue_date ON public.invoices USING btree (issue_date);


--
-- Name: ix_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_invoices_status ON public.invoices USING btree (status);


--
-- Name: ix_ledger_allocations_charge_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_allocations_charge_id ON public.ledger_allocations USING btree (charge_id);


--
-- Name: ix_ledger_allocations_payment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_allocations_payment_id ON public.ledger_allocations USING btree (payment_id);


--
-- Name: ix_ledger_entries_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_business_id ON public.ledger_entries USING btree (business_id);


--
-- Name: ix_ledger_entries_business_id_entry_type_entry_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_business_id_entry_type_entry_date ON public.ledger_entries USING btree (business_id, entry_type, entry_date);


--
-- Name: ix_ledger_entries_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_entries_customer_id ON public.ledger_entries USING btree (customer_id);


--
-- Name: ix_orders_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_business_id ON public.orders USING btree (business_id);


--
-- Name: ix_orders_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_orders_customer_id ON public.orders USING btree (customer_id);


--
-- Name: ix_payments_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_business_id ON public.payments USING btree (business_id);


--
-- Name: ix_payments_business_id_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_business_id_payment_date ON public.payments USING btree (business_id, payment_date);


--
-- Name: ix_payments_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_customer_id ON public.payments USING btree (customer_id);


--
-- Name: ix_payments_sale_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_sale_id ON public.payments USING btree (sale_id);


--
-- Name: ix_payments_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payments_treasury_account_id ON public.payments USING btree (treasury_account_id);


--
-- Name: ix_permissions_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_permissions_name ON public.permissions USING btree (name);


--
-- Name: ix_product_barcodes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_product_barcodes_code ON public.product_barcodes USING btree (code);


--
-- Name: ix_product_barcodes_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_barcodes_product_id ON public.product_barcodes USING btree (product_id);


--
-- Name: ix_product_movements_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_movements_business_id ON public.product_movements USING btree (business_id);


--
-- Name: ix_product_movements_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_product_movements_product_id ON public.product_movements USING btree (product_id);


--
-- Name: ix_products_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_products_business_id ON public.products USING btree (business_id);


--
-- Name: ix_quick_notes_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quick_notes_business_id ON public.quick_notes USING btree (business_id);


--
-- Name: ix_quote_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quote_items_product_id ON public.quote_items USING btree (product_id);


--
-- Name: ix_quote_items_quote_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- Name: ix_quotes_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_business_id ON public.quotes USING btree (business_id);


--
-- Name: ix_quotes_converted_sale_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_converted_sale_id ON public.quotes USING btree (converted_sale_id);


--
-- Name: ix_quotes_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_created_by ON public.quotes USING btree (created_by);


--
-- Name: ix_quotes_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_customer_id ON public.quotes USING btree (customer_id);


--
-- Name: ix_quotes_quote_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_quote_code ON public.quotes USING btree (quote_code);


--
-- Name: ix_quotes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_quotes_status ON public.quotes USING btree (status);


--
-- Name: ix_raw_material_movements_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_business_id ON public.raw_material_movements USING btree (business_id);


--
-- Name: ix_raw_material_movements_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_created_at ON public.raw_material_movements USING btree (created_at);


--
-- Name: ix_raw_material_movements_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_created_by ON public.raw_material_movements USING btree (created_by);


--
-- Name: ix_raw_material_movements_movement_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_movement_type ON public.raw_material_movements USING btree (movement_type);


--
-- Name: ix_raw_material_movements_raw_material_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_raw_material_id ON public.raw_material_movements USING btree (raw_material_id);


--
-- Name: ix_raw_material_movements_raw_purchase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_raw_purchase_id ON public.raw_material_movements USING btree (raw_purchase_id);


--
-- Name: ix_raw_material_movements_recipe_consumption_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_material_movements_recipe_consumption_id ON public.raw_material_movements USING btree (recipe_consumption_id);


--
-- Name: ix_raw_materials_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_materials_business_id ON public.raw_materials USING btree (business_id);


--
-- Name: ix_raw_materials_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_materials_is_active ON public.raw_materials USING btree (is_active);


--
-- Name: ix_raw_materials_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_materials_name ON public.raw_materials USING btree (name);


--
-- Name: ix_raw_materials_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_materials_sku ON public.raw_materials USING btree (sku);


--
-- Name: ix_raw_purchase_items_raw_material_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchase_items_raw_material_id ON public.raw_purchase_items USING btree (raw_material_id);


--
-- Name: ix_raw_purchase_items_raw_purchase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchase_items_raw_purchase_id ON public.raw_purchase_items USING btree (raw_purchase_id);


--
-- Name: ix_raw_purchases_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchases_business_id ON public.raw_purchases USING btree (business_id);


--
-- Name: ix_raw_purchases_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchases_created_by ON public.raw_purchases USING btree (created_by);


--
-- Name: ix_raw_purchases_purchase_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchases_purchase_number ON public.raw_purchases USING btree (purchase_number);


--
-- Name: ix_raw_purchases_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchases_status ON public.raw_purchases USING btree (status);


--
-- Name: ix_raw_purchases_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_raw_purchases_supplier_id ON public.raw_purchases USING btree (supplier_id);


--
-- Name: ix_recipe_consumption_items_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumption_items_created_at ON public.recipe_consumption_items USING btree (created_at);


--
-- Name: ix_recipe_consumption_items_raw_material_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumption_items_raw_material_id ON public.recipe_consumption_items USING btree (raw_material_id);


--
-- Name: ix_recipe_consumption_items_raw_material_movement_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumption_items_raw_material_movement_id ON public.recipe_consumption_items USING btree (raw_material_movement_id);


--
-- Name: ix_recipe_consumption_items_recipe_consumption_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumption_items_recipe_consumption_id ON public.recipe_consumption_items USING btree (recipe_consumption_id);


--
-- Name: ix_recipe_consumptions_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_business_id ON public.recipe_consumptions USING btree (business_id);


--
-- Name: ix_recipe_consumptions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_created_at ON public.recipe_consumptions USING btree (created_at);


--
-- Name: ix_recipe_consumptions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_created_by ON public.recipe_consumptions USING btree (created_by);


--
-- Name: ix_recipe_consumptions_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_product_id ON public.recipe_consumptions USING btree (product_id);


--
-- Name: ix_recipe_consumptions_recipe_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_recipe_id ON public.recipe_consumptions USING btree (recipe_id);


--
-- Name: ix_recipe_consumptions_related_sale_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_consumptions_related_sale_id ON public.recipe_consumptions USING btree (related_sale_id);


--
-- Name: ix_recipe_items_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_items_created_at ON public.recipe_items USING btree (created_at);


--
-- Name: ix_recipe_items_raw_material_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_items_raw_material_id ON public.recipe_items USING btree (raw_material_id);


--
-- Name: ix_recipe_items_recipe_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipe_items_recipe_id ON public.recipe_items USING btree (recipe_id);


--
-- Name: ix_recipes_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipes_business_id ON public.recipes USING btree (business_id);


--
-- Name: ix_recipes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipes_created_at ON public.recipes USING btree (created_at);


--
-- Name: ix_recipes_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipes_is_active ON public.recipes USING btree (is_active);


--
-- Name: ix_recipes_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipes_name ON public.recipes USING btree (name);


--
-- Name: ix_recipes_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recipes_product_id ON public.recipes USING btree (product_id);


--
-- Name: ix_recurring_expenses_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recurring_expenses_business_id ON public.recurring_expenses USING btree (business_id);


--
-- Name: ix_recurring_expenses_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_recurring_expenses_is_active ON public.recurring_expenses USING btree (is_active);


--
-- Name: ix_reminders_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_reminders_business_id ON public.reminders USING btree (business_id);


--
-- Name: ix_roles_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_roles_name ON public.roles USING btree (name);


--
-- Name: ix_sales_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_business_id ON public.sales USING btree (business_id);


--
-- Name: ix_sales_business_id_sale_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_business_id_sale_date ON public.sales USING btree (business_id, sale_date);


--
-- Name: ix_sales_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_customer_id ON public.sales USING btree (customer_id);


--
-- Name: ix_sales_goals_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_goals_business_id ON public.sales_goals USING btree (business_id);


--
-- Name: ix_sales_goals_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_goals_user_id ON public.sales_goals USING btree (user_id);


--
-- Name: ix_sales_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_treasury_account_id ON public.sales USING btree (treasury_account_id);


--
-- Name: ix_sales_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_sales_user_id ON public.sales USING btree (user_id);


--
-- Name: ix_subscription_payments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_subscription_payments_user_id ON public.subscription_payments USING btree (user_id);


--
-- Name: ix_summary_cache_states_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_cache_states_business_id ON public.summary_cache_states USING btree (business_id);


--
-- Name: ix_summary_cache_states_business_namespace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_cache_states_business_namespace ON public.summary_cache_states USING btree (business_id, namespace);


--
-- Name: ix_summary_cache_states_namespace; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_cache_states_namespace ON public.summary_cache_states USING btree (namespace);


--
-- Name: ix_summary_daily_aggregates_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_daily_aggregates_business_id ON public.summary_daily_aggregates USING btree (business_id);


--
-- Name: ix_summary_daily_aggregates_business_summary_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_daily_aggregates_business_summary_date ON public.summary_daily_aggregates USING btree (business_id, summary_date);


--
-- Name: ix_summary_daily_aggregates_summary_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_summary_daily_aggregates_summary_date ON public.summary_daily_aggregates USING btree (summary_date);


--
-- Name: ix_supplier_payables_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payables_business_id ON public.supplier_payables USING btree (business_id);


--
-- Name: ix_supplier_payables_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payables_created_at ON public.supplier_payables USING btree (created_at);


--
-- Name: ix_supplier_payables_raw_purchase_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payables_raw_purchase_id ON public.supplier_payables USING btree (raw_purchase_id);


--
-- Name: ix_supplier_payables_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payables_status ON public.supplier_payables USING btree (status);


--
-- Name: ix_supplier_payables_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payables_supplier_id ON public.supplier_payables USING btree (supplier_id);


--
-- Name: ix_supplier_payments_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_business_id ON public.supplier_payments USING btree (business_id);


--
-- Name: ix_supplier_payments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_created_at ON public.supplier_payments USING btree (created_at);


--
-- Name: ix_supplier_payments_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_created_by ON public.supplier_payments USING btree (created_by);


--
-- Name: ix_supplier_payments_payment_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_payment_date ON public.supplier_payments USING btree (payment_date);


--
-- Name: ix_supplier_payments_supplier_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_supplier_id ON public.supplier_payments USING btree (supplier_id);


--
-- Name: ix_supplier_payments_supplier_payable_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_supplier_payable_id ON public.supplier_payments USING btree (supplier_payable_id);


--
-- Name: ix_supplier_payments_treasury_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_supplier_payments_treasury_account_id ON public.supplier_payments USING btree (treasury_account_id);


--
-- Name: ix_suppliers_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_suppliers_business_id ON public.suppliers USING btree (business_id);


--
-- Name: ix_suppliers_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_suppliers_is_active ON public.suppliers USING btree (is_active);


--
-- Name: ix_suppliers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_suppliers_name ON public.suppliers USING btree (name);


--
-- Name: ix_team_feedback_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_team_feedback_business_id ON public.team_feedback USING btree (business_id);


--
-- Name: ix_team_invitations_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_team_invitations_business_id ON public.team_invitations USING btree (business_id);


--
-- Name: ix_team_invitations_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_team_invitations_token ON public.team_invitations USING btree (token);


--
-- Name: ix_team_members_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_team_members_business_id ON public.team_members USING btree (business_id);


--
-- Name: ix_team_members_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: ix_treasury_accounts_account_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_accounts_account_type ON public.treasury_accounts USING btree (account_type);


--
-- Name: ix_treasury_accounts_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_accounts_business_id ON public.treasury_accounts USING btree (business_id);


--
-- Name: ix_treasury_accounts_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_accounts_is_active ON public.treasury_accounts USING btree (is_active);


--
-- Name: ix_treasury_accounts_is_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_accounts_is_default ON public.treasury_accounts USING btree (is_default);


--
-- Name: ix_treasury_accounts_payment_method_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_accounts_payment_method_key ON public.treasury_accounts USING btree (payment_method_key);


--
-- Name: ix_treasury_transfers_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_transfers_business_id ON public.treasury_transfers USING btree (business_id);


--
-- Name: ix_treasury_transfers_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_transfers_created_at ON public.treasury_transfers USING btree (created_at);


--
-- Name: ix_treasury_transfers_destination_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_transfers_destination_account_id ON public.treasury_transfers USING btree (destination_account_id);


--
-- Name: ix_treasury_transfers_origin_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_transfers_origin_account_id ON public.treasury_transfers USING btree (origin_account_id);


--
-- Name: ix_treasury_transfers_transfer_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_treasury_transfers_transfer_date ON public.treasury_transfers USING btree (transfer_date);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_email_personal; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email_personal ON public.users USING btree (email) WHERE ((account_type)::text = 'personal'::text);


--
-- Name: ix_users_email_team; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_email_team ON public.users USING btree (email, linked_business_id) WHERE ((account_type)::text = 'team_member'::text);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: business_modules business_modules_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_modules
    ADD CONSTRAINT business_modules_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: businesses businesses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: client_sync_operations client_sync_operations_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sync_operations
    ADD CONSTRAINT client_sync_operations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: client_sync_operations client_sync_operations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_sync_operations
    ADD CONSTRAINT client_sync_operations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: customers customers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: customers customers_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: customers customers_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: debt_payments debt_payments_debt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_payments
    ADD CONSTRAINT debt_payments_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id);


--
-- Name: debt_payments debt_payments_treasury_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debt_payments
    ADD CONSTRAINT debt_payments_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: debts debts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: debts debts_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id);


--
-- Name: expenses expenses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: expenses expenses_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_debt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES public.debts(id);


--
-- Name: expenses expenses_debt_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_debt_payment_id_fkey FOREIGN KEY (debt_payment_id) REFERENCES public.debt_payments(id);


--
-- Name: expenses expenses_raw_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_raw_purchase_id_fkey FOREIGN KEY (raw_purchase_id) REFERENCES public.raw_purchases(id);


--
-- Name: expenses expenses_recurring_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_recurring_expense_id_fkey FOREIGN KEY (recurring_expense_id) REFERENCES public.recurring_expenses(id);


--
-- Name: expenses expenses_supplier_payable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_supplier_payable_id_fkey FOREIGN KEY (supplier_payable_id) REFERENCES public.supplier_payables(id);


--
-- Name: expenses expenses_supplier_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_supplier_payment_id_fkey FOREIGN KEY (supplier_payment_id) REFERENCES public.supplier_payments(id);


--
-- Name: expenses expenses_treasury_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: expenses expenses_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: audit_logs fk_audit_logs_actor_member_id_team_members; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_actor_member_id_team_members FOREIGN KEY (actor_member_id) REFERENCES public.team_members(id);


--
-- Name: audit_logs fk_audit_logs_actor_user_id_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_actor_user_id_users FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: audit_logs fk_audit_logs_business_id_businesses; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_business_id_businesses FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: invoice_payments fk_invoice_payments_source_payment_id_invoice_payments; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT fk_invoice_payments_source_payment_id_invoice_payments FOREIGN KEY (source_payment_id) REFERENCES public.invoice_payments(id);


--
-- Name: invoice_payments fk_invoice_payments_treasury_account_id_treasury_accounts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT fk_invoice_payments_treasury_account_id_treasury_accounts FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: sales fk_sales_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fk_sales_users FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: invoice_payments invoice_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoice_payments invoice_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_payments
    ADD CONSTRAINT invoice_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoice_settings invoice_settings_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT invoice_settings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: invoices invoices_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: ledger_allocations ledger_allocations_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_allocations
    ADD CONSTRAINT ledger_allocations_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES public.ledger_entries(id);


--
-- Name: ledger_allocations ledger_allocations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_allocations
    ADD CONSTRAINT ledger_allocations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.ledger_entries(id);


--
-- Name: ledger_entries ledger_entries_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: ledger_entries ledger_entries_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: orders orders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: payments payments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: payments payments_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: payments payments_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id);


--
-- Name: payments payments_treasury_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: payments payments_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: product_barcodes product_barcodes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_barcodes
    ADD CONSTRAINT product_barcodes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_movements product_movements_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_movements
    ADD CONSTRAINT product_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: product_movements product_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_movements
    ADD CONSTRAINT product_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_movements product_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_movements
    ADD CONSTRAINT product_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: quick_notes quick_notes_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_notes
    ADD CONSTRAINT quick_notes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: quote_items quote_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: quotes quotes_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: quotes quotes_converted_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_converted_sale_id_fkey FOREIGN KEY (converted_sale_id) REFERENCES public.sales(id);


--
-- Name: quotes quotes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: quotes quotes_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: raw_material_movements raw_material_movements_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: raw_material_movements raw_material_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: raw_material_movements raw_material_movements_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: raw_material_movements raw_material_movements_raw_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_raw_purchase_id_fkey FOREIGN KEY (raw_purchase_id) REFERENCES public.raw_purchases(id);


--
-- Name: raw_material_movements raw_material_movements_recipe_consumption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_material_movements
    ADD CONSTRAINT raw_material_movements_recipe_consumption_id_fkey FOREIGN KEY (recipe_consumption_id) REFERENCES public.recipe_consumptions(id);


--
-- Name: raw_materials raw_materials_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_materials
    ADD CONSTRAINT raw_materials_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: raw_purchase_items raw_purchase_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchase_items
    ADD CONSTRAINT raw_purchase_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: raw_purchase_items raw_purchase_items_raw_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchase_items
    ADD CONSTRAINT raw_purchase_items_raw_purchase_id_fkey FOREIGN KEY (raw_purchase_id) REFERENCES public.raw_purchases(id);


--
-- Name: raw_purchases raw_purchases_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases
    ADD CONSTRAINT raw_purchases_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: raw_purchases raw_purchases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases
    ADD CONSTRAINT raw_purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: raw_purchases raw_purchases_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raw_purchases
    ADD CONSTRAINT raw_purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: recipe_consumption_items recipe_consumption_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumption_items
    ADD CONSTRAINT recipe_consumption_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: recipe_consumption_items recipe_consumption_items_raw_material_movement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumption_items
    ADD CONSTRAINT recipe_consumption_items_raw_material_movement_id_fkey FOREIGN KEY (raw_material_movement_id) REFERENCES public.raw_material_movements(id);


--
-- Name: recipe_consumption_items recipe_consumption_items_recipe_consumption_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumption_items
    ADD CONSTRAINT recipe_consumption_items_recipe_consumption_id_fkey FOREIGN KEY (recipe_consumption_id) REFERENCES public.recipe_consumptions(id);


--
-- Name: recipe_consumptions recipe_consumptions_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: recipe_consumptions recipe_consumptions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: recipe_consumptions recipe_consumptions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: recipe_consumptions recipe_consumptions_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id);


--
-- Name: recipe_consumptions recipe_consumptions_related_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_consumptions
    ADD CONSTRAINT recipe_consumptions_related_sale_id_fkey FOREIGN KEY (related_sale_id) REFERENCES public.sales(id);


--
-- Name: recipe_items recipe_items_raw_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_items
    ADD CONSTRAINT recipe_items_raw_material_id_fkey FOREIGN KEY (raw_material_id) REFERENCES public.raw_materials(id);


--
-- Name: recipe_items recipe_items_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_items
    ADD CONSTRAINT recipe_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id);


--
-- Name: recipes recipes_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: recipes recipes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: recurring_expenses recurring_expenses_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_expenses
    ADD CONSTRAINT recurring_expenses_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: reminders reminders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: reminders reminders_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: reminders reminders_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: roles roles_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: sales sales_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales_goal_viewers sales_goal_viewers_sales_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goal_viewers
    ADD CONSTRAINT sales_goal_viewers_sales_goal_id_fkey FOREIGN KEY (sales_goal_id) REFERENCES public.sales_goals(id);


--
-- Name: sales_goal_viewers sales_goal_viewers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goal_viewers
    ADD CONSTRAINT sales_goal_viewers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales_goals sales_goals_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goals
    ADD CONSTRAINT sales_goals_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: sales_goals sales_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_goals
    ADD CONSTRAINT sales_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sales sales_treasury_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: sales sales_updated_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: subscription_payments subscription_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: summary_cache_states summary_cache_states_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_cache_states
    ADD CONSTRAINT summary_cache_states_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: summary_daily_aggregates summary_daily_aggregates_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.summary_daily_aggregates
    ADD CONSTRAINT summary_daily_aggregates_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: supplier_payables supplier_payables_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables
    ADD CONSTRAINT supplier_payables_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: supplier_payables supplier_payables_raw_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables
    ADD CONSTRAINT supplier_payables_raw_purchase_id_fkey FOREIGN KEY (raw_purchase_id) REFERENCES public.raw_purchases(id);


--
-- Name: supplier_payables supplier_payables_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payables
    ADD CONSTRAINT supplier_payables_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: supplier_payments supplier_payments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: supplier_payments supplier_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: supplier_payments supplier_payments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: supplier_payments supplier_payments_supplier_payable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_supplier_payable_id_fkey FOREIGN KEY (supplier_payable_id) REFERENCES public.supplier_payables(id);


--
-- Name: supplier_payments supplier_payments_treasury_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_payments
    ADD CONSTRAINT supplier_payments_treasury_account_id_fkey FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: suppliers suppliers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: team_feedback team_feedback_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_feedback
    ADD CONSTRAINT team_feedback_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: team_feedback team_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_feedback
    ADD CONSTRAINT team_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: team_invitations team_invitations_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: team_invitations team_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: team_invitations team_invitations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invitations
    ADD CONSTRAINT team_invitations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: team_members team_members_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: team_members team_members_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: treasury_accounts treasury_accounts_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_accounts
    ADD CONSTRAINT treasury_accounts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: treasury_transfers treasury_transfers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers
    ADD CONSTRAINT treasury_transfers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id);


--
-- Name: treasury_transfers treasury_transfers_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers
    ADD CONSTRAINT treasury_transfers_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: treasury_transfers treasury_transfers_destination_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers
    ADD CONSTRAINT treasury_transfers_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: treasury_transfers treasury_transfers_origin_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.treasury_transfers
    ADD CONSTRAINT treasury_transfers_origin_account_id_fkey FOREIGN KEY (origin_account_id) REFERENCES public.treasury_accounts(id);


--
-- Name: user_roles user_roles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_linked_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_linked_business_id_fkey FOREIGN KEY (linked_business_id) REFERENCES public.businesses(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Si1JeLsEhncRPMBGfA2HARxbZJfFSxJYEjz5ScH94UGKsI534PFKTyb6qx6XnFf

