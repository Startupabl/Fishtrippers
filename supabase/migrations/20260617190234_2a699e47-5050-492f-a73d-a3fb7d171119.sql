INSERT INTO public.site_pages (slug, title, category, order_priority, is_external, external_url, status, description, content_html)
VALUES (
  'how-bookings-work-for-guides',
  'How Bookings Work for Captains & Guides',
  'resources',
  100,
  false,
  NULL,
  'live',
  'How captains and guides manage trips, instant book vs request to book, and the master calendar on Fishtrippers.',
  $html$<p><strong>⚓ For Captains &amp; Guides</strong></p>
<p>Managing your schedule on Fishtrippers is completely hands-off. It gives you the flexibility to automate your standard trips while retaining total control over your elite packages.</p>
<p>Here is exactly how it works in your dashboard:</p>
<h2>1. Set Your Booking Type Per Trip</h2>
<p>You have full control over how you book your business. In your Trip Settings, you choose the rules for each package:</p>
<ul>
<li>Set your straightforward inshore or half-day trips to <strong>Instant Book</strong> to fill your calendar on autopilot.</li>
<li>Set your heavy-fuel, deep-sea marlin trips or specialized charters to <strong>Request to Book</strong> so you can check offshore weather, blue water charts, and fuel prices before officially accepting a client.</li>
</ul>
<h2>2. One Master Calendar Controls Everything</h2>
<p>You don't need to struggle with keeping multiple calendars synced up. You have one single Master Calendar for your entire company page.</p>
<ul>
<li>Head to the <strong>"Manage Availability"</strong> tab in your dashboard sidebar.</li>
<li>You will see a clean, 12-month calendar grid.</li>
<li>Simply click on any dates you don't want to fish (holidays, boat maintenance days, or personal vacation) to turn them gray and <strong>Block</strong> them from public view.</li>
</ul>
<h2>3. Automatic Calendar Sync</h2>
<p>Because you can only be on the water with one group at a time, the system protects your schedule seamlessly:</p>
<ul>
<li>The moment an angler instantly checks out or you accept a trip request for an open date, that date automatically changes to <strong>Booked</strong> on your Master Calendar.</li>
<li>The system instantly flags that day as unavailable across all of your other listed trip packages on the front end.</li>
</ul>
<p>If someone instantly books your morning redfish trip, the calendar instantly locks down that day so nobody can accidentally book your offshore reef trip at the exact same time. You get the bookings without the scheduling headaches.</p>$html$
)
ON CONFLICT (slug) DO NOTHING;