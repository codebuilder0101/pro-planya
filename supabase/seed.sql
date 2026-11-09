-- PlanYá seed data (local development and preview projects only).
-- Araucanía locations only. Dates are relative to the moment the seed runs,
-- so plans are always upcoming. Coordinates are approximate.
--
-- Seed hosts below CANNOT log in (no password). Test accounts with passwords
-- (explorer / host / admin) are created by supabase/scripts/create-test-users.mjs
-- using credentials from your local .env, never committed.
--
-- No photos are seeded: the app shows a category-colored fallback until real
-- photos are uploaded.

-- Local time in America/Santiago, N days from today at HH:MM.
create function pg_temp.at_local(p_days integer, p_time time)
returns timestamptz
language sql
stable
as $$
  select ((date_trunc('day', now() at time zone 'America/Santiago') + make_interval(days => p_days)) + p_time)
         at time zone 'America/Santiago';
$$;

create function pg_temp.pt(p_lat double precision, p_lng double precision)
returns extensions.geography
language sql
immutable
as $$
  select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
$$;

-- ---------------------------------------------------------------- categories
insert into public.categories (id, name, icon, color, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'Aventura',      'compass-outline',       '#D9622B', 1),
  ('c0000000-0000-4000-8000-000000000002', 'Naturaleza',    'leaf-outline',          '#2E7D4F', 2),
  ('c0000000-0000-4000-8000-000000000003', 'Gastronomía',   'restaurant-outline',    '#B8433A', 3),
  ('c0000000-0000-4000-8000-000000000004', 'Cultura',       'color-palette-outline', '#7349A8', 4),
  ('c0000000-0000-4000-8000-000000000005', 'Deportes',      'bicycle-outline',       '#1F6FA8', 5),
  ('c0000000-0000-4000-8000-000000000006', 'Música',        'musical-notes-outline', '#B83E7A', 6),
  ('c0000000-0000-4000-8000-000000000007', 'Bienestar',     'flower-outline',        '#2F8F86', 7),
  ('c0000000-0000-4000-8000-000000000008', 'Familia',       'people-outline',        '#B7791F', 8),
  ('c0000000-0000-4000-8000-000000000009', 'Talleres',      'construct-outline',     '#7A5C33', 9),
  ('c0000000-0000-4000-8000-000000000010', 'Vida nocturna', 'moon-outline',          '#36407A', 10);

-- ---------------------------------------------------------------- seed hosts
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'camila.rivas@example.com', '', now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"role":"host","full_name":"Camila Rivas"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'matias.huenchuman@example.com', '', now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"role":"host","full_name":"Matías Huenchumán"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
   'valentina.sepulveda@example.com', '', now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"role":"host","full_name":"Valentina Sepúlveda"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
   'diego.paillalef@example.com', '', now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{"role":"host","full_name":"Diego Paillalef"}', now(), now());

update public.profiles set city = 'Temuco', bio = 'Guía local. Me encanta mostrar los cerros y la cocina de Temuco.'
  where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set city = 'Pucón', bio = 'Guía de montaña y río en Pucón hace más de 10 años.'
  where id = 'a0000000-0000-4000-8000-000000000002';
update public.profiles set city = 'Temuco', bio = 'Gestora cultural. Organizo talleres y encuentros en Temuco.'
  where id = 'a0000000-0000-4000-8000-000000000003';
update public.profiles set city = 'Pucón', bio = 'Instructor de kayak y SUP en el lago Villarrica.'
  where id = 'a0000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------- experiences
insert into public.experiences (
  id, host_id, title, description, category_id, location, comuna,
  starts_at, ends_at, capacity, is_free, price_clp, source_name, source_url, status, is_featured
) values
  -- Temuco and surroundings
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Caminata al Cerro Ñielol al amanecer',
   'Subimos por los senderos del Monumento Natural Cerro Ñielol para ver salir el sol sobre Temuco. Ritmo tranquilo, apto para principiantes. Trae agua y ropa abrigada.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-38.7236, -72.5878), 'Temuco',
   pg_temp.at_local(2, '07:30'), pg_temp.at_local(2, '10:00'), 15, true, null, null, null, 'published', true),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Ruta gastronómica por la Feria Pinto',
   'Recorremos los puestos de la Feria Pinto probando sopaipillas, catutos, merkén y frutas de la temporada. Incluye degustaciones.',
   'c0000000-0000-4000-8000-000000000003', pg_temp.pt(-38.7335, -72.5968), 'Temuco',
   pg_temp.at_local(3, '11:00'), pg_temp.at_local(3, '13:30'), 10, false, 12000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'Taller de cerámica inspirada en la tradición mapuche',
   'Aprende técnicas básicas de modelado a mano y crea tu propia pieza inspirada en la alfarería mapuche. Materiales incluidos.',
   'c0000000-0000-4000-8000-000000000009', pg_temp.pt(-38.7390, -72.5985), 'Temuco',
   pg_temp.at_local(4, '18:00'), pg_temp.at_local(4, '20:30'), 8, false, 18000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003',
   'Cicletada por el Parque Isla Cautín',
   'Paseo en bicicleta a ritmo familiar por el Parque Isla Cautín y la ribera del río. Casco obligatorio.',
   'c0000000-0000-4000-8000-000000000005', pg_temp.pt(-38.7452, -72.6150), 'Temuco',
   pg_temp.at_local(5, '10:00'), pg_temp.at_local(5, '12:30'), 25, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003',
   'Noche de jazz en vivo',
   'Trío de jazz local con repertorio de estándares y composiciones propias. Entrada con reserva previa.',
   'c0000000-0000-4000-8000-000000000006', pg_temp.pt(-38.7372, -72.6031), 'Temuco',
   pg_temp.at_local(6, '21:00'), pg_temp.at_local(6, '23:30'), 40, false, 8000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001',
   'Yoga al aire libre en el Cerro Ñielol',
   'Sesión de yoga suave rodeados de bosque nativo. Todos los niveles. Trae tu mat y una manta.',
   'c0000000-0000-4000-8000-000000000007', pg_temp.pt(-38.7262, -72.5866), 'Temuco',
   pg_temp.at_local(7, '09:30'), pg_temp.at_local(7, '11:00'), 20, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003',
   'Visita guiada al Museo Regional de La Araucanía',
   'Recorrido guiado por la historia de La Araucanía: pueblo mapuche, colonización y vida en la frontera.',
   'c0000000-0000-4000-8000-000000000004', pg_temp.pt(-38.7381, -72.6107), 'Temuco',
   pg_temp.at_local(8, '16:00'), pg_temp.at_local(8, '17:30'), 20, true, null,
   'Museo Regional de La Araucanía', null, 'published', false),
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001',
   'Cata de cervezas artesanales del sur',
   'Probamos seis cervezas artesanales de La Araucanía y conversamos con sus maestros cerveceros. Solo mayores de 18.',
   'c0000000-0000-4000-8000-000000000010', pg_temp.pt(-38.7350, -72.5900), 'Temuco',
   pg_temp.at_local(9, '19:30'), pg_temp.at_local(9, '21:30'), 12, false, 15000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003',
   'Tarde de juegos de mesa en familia',
   'Juegos de mesa para todas las edades, con monitores que explican las reglas. Ideal para venir con niños.',
   'c0000000-0000-4000-8000-000000000008', pg_temp.pt(-38.7650, -72.7330), 'Temuco',
   pg_temp.at_local(10, '16:00'), pg_temp.at_local(10, '19:00'), 30, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001',
   'Excursión a la Laguna Captrén en Conguillío',
   'Día completo en el Parque Nacional Conguillío: Laguna Captrén, bosque de araucarias y vista al volcán Llaima. Incluye traslado desde Temuco.',
   'c0000000-0000-4000-8000-000000000001', pg_temp.pt(-38.6420, -71.6970), 'Curacautín',
   pg_temp.at_local(12, '08:00'), pg_temp.at_local(12, '18:00'), 12, false, 25000, null, null, 'published', false),

  -- Pucón and surroundings
  ('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000002',
   'Rafting en el río Trancura',
   'Bajada en balsa por los rápidos del Trancura bajo (clase III). Incluye equipo, guía certificado y charla de seguridad.',
   'c0000000-0000-4000-8000-000000000001', pg_temp.pt(-39.2900, -71.8500), 'Pucón',
   pg_temp.at_local(3, '15:00'), pg_temp.at_local(3, '18:00'), 10, false, 25000, null, null, 'published', true),
  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000002',
   'Ascenso guiado al volcán Villarrica',
   'Ascenso técnico con guías certificados hasta el cráter. Requiere buena condición física. Incluye equipo de montaña.',
   'c0000000-0000-4000-8000-000000000001', pg_temp.pt(-39.3870, -71.9520), 'Pucón',
   pg_temp.at_local(6, '06:00'), pg_temp.at_local(6, '17:00'), 8, false, 120000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000004',
   'Atardecer en kayak en el lago Villarrica',
   'Remada tranquila desde Playa Grande para ver la puesta de sol frente al volcán. No necesitas experiencia previa.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.2730, -71.9800), 'Pucón',
   pg_temp.at_local(2, '19:00'), pg_temp.at_local(2, '21:00'), 12, false, 20000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000002',
   'Trekking a los lagos del Parque Huerquehue',
   'Sendero Los Lagos: lagos Chico, Toro y Verde entre araucarias milenarias. 14 km ida y vuelta, dificultad media.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.1530, -71.7180), 'Pucón',
   pg_temp.at_local(7, '09:00'), pg_temp.at_local(7, '17:00'), 15, false, 15000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000004',
   'Visita a los Ojos del Caburgua',
   'Caminata corta a las cascadas turquesa de los Ojos del Caburgua. Plan relajado para conocer el entorno de Pucón.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.2006, -71.8225), 'Pucón',
   pg_temp.at_local(4, '11:00'), pg_temp.at_local(4, '14:00'), 20, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000004',
   'Tarde de termas entre montañas',
   'Visita a termas naturales cerca de Pucón. Incluye traslado de ida y vuelta. Trae traje de baño y toalla.',
   'c0000000-0000-4000-8000-000000000007', pg_temp.pt(-39.2500, -71.7000), 'Pucón',
   pg_temp.at_local(5, '15:00'), pg_temp.at_local(5, '20:00'), 14, false, 22000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000002',
   'Feria artesanal y música mapuche en Pucón',
   'Encuentro en el centro de Pucón con artesanía local, comida y presentación de música mapuche.',
   'c0000000-0000-4000-8000-000000000004', pg_temp.pt(-39.2820, -71.9545), 'Pucón',
   pg_temp.at_local(5, '17:00'), pg_temp.at_local(5, '20:00'), 50, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000004',
   'Clase de stand up paddle en La Poza',
   'Clase de iniciación al SUP en las aguas calmas de La Poza. Incluye tabla, remo y chaleco.',
   'c0000000-0000-4000-8000-000000000005', pg_temp.pt(-39.2760, -71.9640), 'Pucón',
   pg_temp.at_local(8, '10:00'), pg_temp.at_local(8, '12:00'), 8, false, 18000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000002',
   'Ruta de quesos y vinos en Villarrica',
   'Degustación de quesos de productores locales y vinos del sur en la ribera del lago Villarrica.',
   'c0000000-0000-4000-8000-000000000003', pg_temp.pt(-39.2785, -72.2270), 'Villarrica',
   pg_temp.at_local(9, '13:00'), pg_temp.at_local(9, '17:00'), 14, false, 35000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000002',
   'Fogata y relatos bajo las estrellas en Curarrehue',
   'Noche alrededor del fuego con relatos y leyendas de la zona, sopaipillas y mate. Apto para familias.',
   'c0000000-0000-4000-8000-000000000008', pg_temp.pt(-39.3590, -71.5880), 'Curarrehue',
   pg_temp.at_local(11, '20:30'), pg_temp.at_local(11, '23:00'), 20, false, 8000, null, null, 'published', false),

  -- Test fixtures (must NEVER appear in discovery lists):
  -- two past plans (for "Pasados" and reviews) and one hidden upcoming plan.
  ('e0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000001',
   'Caminata al Cerro Ñielol (edición anterior)',
   'Edición pasada de la caminata al amanecer en el Cerro Ñielol.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-38.7236, -72.5878), 'Temuco',
   pg_temp.at_local(-10, '07:30'), pg_temp.at_local(-10, '10:00'), 15, true, null, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000004',
   'Kayak en el lago Villarrica (edición anterior)',
   'Edición pasada de la remada al atardecer.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.2730, -71.9800), 'Pucón',
   pg_temp.at_local(-5, '19:00'), pg_temp.at_local(-5, '21:00'), 12, false, 20000, null, null, 'published', false),
  ('e0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000003',
   'Taller de fotografía urbana (oculto)',
   'Plan oculto por su anfitriona; no debe aparecer en las listas.',
   'c0000000-0000-4000-8000-000000000009', pg_temp.pt(-38.7392, -72.5904), 'Temuco',
   pg_temp.at_local(6, '15:00'), pg_temp.at_local(6, '17:00'), 10, true, null, null, null, 'hidden', false);

-- ---------------------------------------------------------------- places
insert into public.places (name, description, category_id, location, comuna, photo_url, tags) values
  ('Monumento Natural Cerro Ñielol',
   'Bosque nativo y miradores en pleno Temuco. Lugar histórico y sagrado para el pueblo mapuche.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-38.7236, -72.5878), 'Temuco', null,
   array['Senderismo', 'Mirador', 'Bosque nativo']),
  ('Feria Pinto',
   'El mercado más tradicional de Temuco: verduras, frutas, merkén, artesanía y cocinerías.',
   'c0000000-0000-4000-8000-000000000003', pg_temp.pt(-38.7335, -72.5968), 'Temuco', null,
   array['Mercado', 'Comida local']),
  ('Museo Regional de La Araucanía',
   'Colecciones sobre la historia y cultura de la región, en una casona patrimonial.',
   'c0000000-0000-4000-8000-000000000004', pg_temp.pt(-38.7381, -72.6107), 'Temuco', null,
   array['Museo', 'Historia']),
  ('Parque Nacional Conguillío',
   'Araucarias milenarias, lagunas y coladas de lava a los pies del volcán Llaima.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-38.6420, -71.6970), 'Curacautín', null,
   array['Parque nacional', 'Araucarias', 'Volcán']),
  ('Playa Grande de Pucón',
   'La playa de arena volcánica del lago Villarrica, con vista directa al volcán.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.2730, -71.9800), 'Pucón', null,
   array['Lago', 'Playa', 'Atardecer']),
  ('Ojos del Caburgua',
   'Cascadas y pozones de agua turquesa en medio del bosque, a minutos de Pucón.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.2006, -71.8225), 'Pucón', null,
   array['Cascada', 'Naturaleza']),
  ('Parque Nacional Huerquehue',
   'Senderos entre lagos de montaña y bosques de araucaria.',
   'c0000000-0000-4000-8000-000000000002', pg_temp.pt(-39.1530, -71.7180), 'Pucón', null,
   array['Trekking', 'Lagos', 'Parque nacional']),
  ('Volcán Villarrica',
   'Uno de los volcanes más activos de Sudamérica. Ascenso solo con guías autorizados.',
   'c0000000-0000-4000-8000-000000000001', pg_temp.pt(-39.4200, -71.9390), 'Pucón', null,
   array['Volcán', 'Montaña', 'Aventura']);
