# Connection Chat — Testing Guide

> **Both servers already running:**
> - Frontend → `http://localhost:5173`
> - Backend  → `http://localhost:5001`

---

## 1. Authentication

### Sign up (User A)
1. Open `http://localhost:5173/signup` in **Browser Tab 1**
2. Fill in Name, Email, Password (min 6 chars) → click **Create account**
3. You should be redirected to `/` (Home)

### Sign up (User B)
1. Open `http://localhost:5173/signup` in **Browser Tab 2** (or Incognito window)
2. Create a second account with a different email
3. Redirected to `/` — sidebar shows "No conversations yet"

### Login / Logout
- Logout via the **Logout** button in the navbar
- Go to `/login`, log back in — session restores from the httpOnly cookie

---

## 2. Profile & Settings

### Edit profile
1. Go to `/profile`
2. Change name or bio → click **Save changes** — success message appears
3. Navbar shows updated name immediately

### Change password
1. On `/profile`, scroll to **Change password**
2. Enter current password + new password → click **Update password**
3. Logout → login with the **new** password to confirm

### Dark mode
1. Toggle the 🌙/☀️ icon in the navbar — UI switches to near-black theme instantly
2. Refresh the page — dark mode persists (stored in `localStorage`)

---

## 3. Friends

> Do these steps while **both tabs are logged in as different users**

### Send a friend request
1. In Tab 1 (User A), go to `/friends` → click **Search** tab
2. Type part of User B's name → their card appears
3. Click **Add** — button changes to **Sent**

### Accept the request
1. In Tab 2 (User B), go to `/friends` → click **Requests** tab
2. You'll see User A's request with a badge count
3. Click **Accept** — request disappears

### Verify friendship
1. Both tabs: click **Friends** tab — each other now appears
2. Online indicator (green dot) shows when the other user is connected

### Remove a friend
- Click **Remove** next to any friend — they disappear from the list

---

## 4. Real-Time Chat

> Both users must be friends first (Step 3)

### Start a conversation
1. In Tab 1, go to `/` (Home)
2. Click the **+** icon in the sidebar → a friend picker appears
3. Search for User B's name → click them → conversation opens

### Send messages
1. Type a message → press **Enter** or click the send button
2. In Tab 2, the message appears **instantly** (real-time via Socket.IO)
3. Check the status icons next to your messages:
   - **✓** = Sent
   - **✓✓** (grey) = Delivered (recipient is online)
   - **✓✓** (indigo) = Seen (recipient opened the chat)

### Typing indicator
1. In Tab 1, start typing (don't send)
2. In Tab 2, three bouncing dots appear below the messages

### Load older messages
1. Send 25+ messages to fill the history
2. Scroll to the very top of the chat window
3. A **"Load earlier messages"** button appears — click to fetch older ones

---

## 5. Image Upload

> Cloudinary is configured in your `.env` — image uploads are live

1. In the message input, click the **📷 image icon** (left of the text field)
2. Select any image (max 5 MB)
3. A spinner shows while uploading to Cloudinary
4. The image appears as a message bubble in both tabs instantly

---

## 6. Admin Panel

> You need to promote a user to admin first

### Make yourself admin
Run this in your **MongoDB shell** or **MongoDB Compass**:
```js
db.users.updateOne(
  { email: "YOUR_EMAIL_HERE" },
  { $set: { role: "admin" } }
)
```
Then **log out and log back in** so the JWT re-reads the updated role.

### Test admin features
1. The navbar now shows an **Admin** link
2. Go to `/admin`
3. See **stats cards** — Total Users, Online Now, Messages, Banned
4. The **user table** lists all users with join date and status
5. Click **Ban** on a user — their status badge changes to "Banned"
6. Try logging in as that user → `403 Account is banned`
7. Back in Admin, click **Unban** — user can log in again

---

## 7. Audio / Video Calls (WebRTC)

> Both users must have an open conversation

### Start a call
1. In Tab 1, open a conversation with User B
2. Click the **📞 phone icon** (audio) or **📹 video icon** in the chat header
3. Tab 2 shows the **Incoming Call modal** with a pulsing animation
4. In Tab 2, click **Accept**

### In-call controls
| Button | Action |
|---|---|
| Microphone icon | Toggle mute (turns red when muted) |
| Camera icon (video only) | Toggle camera on/off |
| Red phone icon | End the call |

### End call
- Click the red **End call** button in either tab
- Both windows close; a call record is saved automatically

---

## 8. Call History

1. After making at least one call, go to `/call-history`
2. Each entry shows:
   - Other person's name
   - ↑ Outgoing / ↓ Incoming direction
   - Call type (audio/video)
   - Duration (e.g. `1m 23s`)
   - Status (completed / missed / rejected)
   - Date

---

## 9. Quick Sanity Checks

| Check | Expected result |
|---|---|
| `http://localhost:5001/api/health` | `{"status":"ok","timestamp":"..."}` |
| Open `/` without logging in | Redirected to `/login` |
| Open `/admin` as regular user | Redirected to `/` |
| Refresh while logged in | Stay logged in (cookie persists) |
| DevTools → Application → Cookies | `jwt` cookie is `HttpOnly` (not readable by JS) |
| DevTools → Network → WS | Socket.IO WebSocket connection visible |

---

## Common Issues

| Problem | Fix |
|---|---|
| Images not uploading | Check Cloudinary credentials in `backend/.env` and restart backend |
| Messages not real-time | Check DevTools → Network → WS for active socket connection |
| Call doesn't connect | WebRTC STUN works on same network; across different networks needs a TURN server |
| `/admin` shows "Access denied" | Run the MongoDB update AND log out + back in |
| MongoDB connection error | Ensure `mongod` is running locally or your Atlas URI in `.env` is correct |
