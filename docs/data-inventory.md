# Collected data inventory

Input for the future privacy policy and the App Store / Google Play data-safety forms.
Update this file whenever the app starts collecting something new.

| Data | Where it is stored | Why | Shared with |
|---|---|---|---|
| Email | Supabase Auth (`auth.users`) | Account login, password reset | Visible to admins only |
| Password | Supabase Auth (hashed) | Account login | Nobody |
| Full name, profile photo, bio, city, interests | `profiles`, Storage `avatars` | Public profile, "Para ti" recommendations | All signed-in users |
| Role (explorer / host) | `profiles.role` | Permissions | All signed-in users |
| Approximate/precise location, **only while in use** (asked only when the user taps "Usar mi ubicación"; otherwise the profile city center is used) | Not stored (used in the request) | Nearby plans, distances, weather | Open-Meteo receives coordinates rounded to ~1 km for the Home weather chip |
| Plans a host publishes (text, photos, location, dates, price) | `experiences`, `experience_photos`, Storage | Core feature | All signed-in users |
| Bookings | `bookings` | Join plans, seat counts | The booker and that plan's host; participants see name/photo only |
| Chat messages | `messages` | Talk to the host | The two participants only |
| Favorites | `favorites` | "Mis favoritas" | The owner only |
| Reviews | `reviews` | Ratings on plans | All signed-in users |
| Reports and blocks | `reports`, `blocks` | Safety and moderation (Apple UGC requirement) | Reports: admins. Blocks: the owner only |
| Push token + platform | `push_tokens` | Notifications (Stage 3) | Expo push service |

Not collected: phone number, contacts, background location, payment data, advertising IDs, analytics.

Account deletion (required by Apple before submission, not in this scope): deleting the
auth user cascades through every table above; reports keep the row with the user set to NULL.
This is covered by `supabase/tests/db.test.mjs` ("account deletion").
