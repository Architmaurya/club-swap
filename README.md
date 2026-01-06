# Club Match Backend

Backend API for a club-based dating / matching app (similar to a nightlife-focused Tinder/Bumble).

- Node.js + Express
- MongoDB + Mongoose
- Cloudinary for image storage
- JWT authentication
- Opposite-gender feed with distance filter
- Likes, matches, messages, privacy settings

---

## Getting Started

```bash
npm install
cp .env.example .env
# edit .env with your values

npm run dev
```

Server runs on `http://localhost:5000`.

---


## Auth

### JWT Access & Refresh Token Flow

- **Access Token**: Short-lived JWT, expires in **1 hour**. Used in `Authorization: Bearer <token>` for all protected APIs.
- **Refresh Token**: Long-lived JWT, expires in **30 days**. Used to obtain new access tokens without forcing the user to log in again. Stored securely in the database and returned at login.

#### Login Response Example

```json
{
  "token": "<ACCESS_TOKEN>",
  "refreshToken": "<REFRESH_TOKEN>",
  "user": { ... }
}
```

#### Refreshing Access Token

To get a new access token when the old one expires, call:

**POST `/api/auth/refresh`**

Request:
```json
{
  "refreshToken": "<REFRESH_TOKEN>"
}
```
Response:
```json
{
  "token": "<NEW_ACCESS_TOKEN>"
}
```

If the refresh token is invalid or expired, you'll get a 401 error and must log in again.

#### Example: Using the new access token

```bash
curl -X GET http://localhost:5000/api/profile/me \
  -H "Authorization: Bearer <NEW_ACCESS_TOKEN>"
```

---

### `POST /api/auth/google`

Create or log in a user using Google account.  
(**Note:** you still need to verify the Google ID token on the server side in a real app.)

**Request**

```json
{
  "email": "user@example.com",
  "googleId": "google-oauth-id"
}
```

**Response**

```json
{
  "token": "JWT_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "user": {
    "id": "66af220f89d8c1a88e055f39",
    "email": "user@example.com",
    "role": "user"
  }
}
```

Use the token in all protected APIs:

`Authorization: Bearer JWT_TOKEN`

---

## Profile

> The app uses a multi-step form on the frontend.  
> **No data is stored while filling steps.**  
> The profile is saved **only when user taps _Start Matching_**, which calls `POST /api/profile`.

### `POST /api/profile` (protected)

Create or update the user's profile and optional tonight plan.

**Request**

```json
{
  "name": "Rahul",
  "age": 25,
  "gender": "male",
  "interestedIn": "women",
  "about": "Love live music and rooftop clubs.",
  "city": "Bengaluru",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "favoriteClubs": ["66af223089d8c1a88e055f40"],
  "drinkingLevel": "moderate",
  "splitBill": true,
  "openForAfterparty": false,
  "tonightClubId": "66af223089d8c1a88e055f40",
  "tonightArrivalTime": "10 PM"
}
```

**Response**

```json
{
  "message": "Profile saved",
  "profile": {
    "_id": "66af225b89d8c1a88e055f45",
    "user": "66af220f89d8c1a88e055f39",
    "name": "Rahul",
    "age": 25,
    "gender": "male",
    "interestedIn": "women",
    "city": "Bengaluru",
    "favoriteClubs": ["66af223089d8c1a88e055f40"],
    "drinkingLevel": "moderate",
    "splitBill": true,
    "openForAfterparty": false,
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    }
  }
}
```

---

### `POST /api/profile/photos` (protected)

Upload up to **6 profile photos**. Images are stored in **Cloudinary**, not your server.

- Content-Type: `multipart/form-data`
- Field name: `photos`

**Response**

```json
{
  "message": "Photos uploaded",
  "photos": [
    {
      "_id": "66af22e589d8c1a88e055f4a",
      "user": "66af220f89d8c1a88e055f39",
      "url": "https://res.cloudinary.com/.../photo1.jpg",
      "publicId": "club-match/profile-photos/xyz",
      "order": 1
    }
  ]
}
```

---

### `GET /api/profile/me` (protected)

Returns current user's profile + photos.

---

## Clubs (Admin + User)

### `POST /api/clubs` (admin only)

Create a club from the admin panel.

**Request**

```json
{
  "name": "Vibe Lounge",
  "description": "Trendy club",
  "category": "Trendy club",
  "latitude": 12.97,
  "longitude": 77.59
}
```

**Response**

```json
{
  "club": {
    "_id": "66af230789d8c1a88e055f50",
    "name": "Vibe Lounge",
    "description": "Trendy club",
    "category": "Trendy club",
    "location": {
      "type": "Point",
      "coordinates": [77.59, 12.97]
    },
    "isActive": true
  }
}
```

### `GET /api/clubs` (protected)

List all active clubs – used in “Favorite Clubs” and “Tonight's Plan” screens.

---

## Feed (Opposite-Gender Nearby Profiles)

### `GET /api/feed` (protected)

Returns **up to 20 random profiles** near the user:

- Opposite gender (based on `interestedIn`)
- Within `5km` radius
- Not already liked by you
- Not already matched with you
- Not your own profile

**Request**

Headers:

- `Authorization: Bearer JWT_TOKEN`

**Response**

```json
{
  "feed": [
    {
      "user": "66af240989d8c1a88e055f60",
      "name": "Aisha",
      "age": 24,
      "city": "Bengaluru",
      "gender": "female",
      "distance": 1432.29,
      "photos": [
        { "url": "https://res.cloudinary.com/.../aisha1.jpg", "order": 1 }
      ]
    }
  ]
}
```

---

## Likes & Matches

### `POST /api/matches/like` (protected)

Like another user. If both users like each other → a **Match** is created.

**Request**

```json
{
  "toUserId": "66af240989d8c1a88e055f60"
}
```

**Response**

```json
{
  "like": {
    "_id": "66af248589d8c1a88e055f65",
    "fromUser": "66af220f89d8c1a88e055f39",
    "toUser": "66af240989d8c1a88e055f60"
  },
  "match": {
    "_id": "66af249f89d8c1a88e055f66",
    "user1": "66af220f89d8c1a88e055f39",
    "user2": "66af240989d8c1a88e055f60"
  }
}
```

If the other user has not liked yet, `match` will be `null`.

---

### `GET /api/matches` (protected)

Return list of current user's matches + basic profiles for the other side.

---

## Messages (Chat)

### `POST /api/messages` (protected)

Send a message in a match.

**Request**

```json
{
  "matchId": "66af249f89d8c1a88e055f66",
  "text": "Hey! Are you going to Mirage tonight?"
}
```

**Response**

```json
{
  "message": {
    "_id": "66af24e789d8c1a88e055f6b",
    "match": "66af249f89d8c1a88e055f66",
    "sender": "66af220f89d8c1a88e055f39",
    "text": "Hey! Are you going to Mirage tonight?"
  }
}
```

### `GET /api/messages/:matchId` (protected)

Get all chat messages for a match (oldest → newest).

### Message Deletion & Real-time

This app supports two deletion modes similar to WhatsApp:

- **Delete for Me**: message is removed only from the requester's chat.
- **Delete for Everyone**: message is removed for both participants (only allowed by the sender within 1 hour).

#### `DELETE /api/messages/:id?scope=me|everyone` (protected)

- `scope=me` (default): hides the message for the authenticated user by adding them to `deletedFor`. No socket event is emitted — client should remove it locally.
- `scope=everyone`: only the message `sender` can call this and only within 1 hour of creation. The server sets `deletedForEveryone=true`, clears `text`/`reactions`, and emits a `messageDeleted` socket event to the match room.

**Request example (Delete for me)**

```bash
curl -X DELETE "http://localhost:5000/api/messages/MSG_ID" \
  -H "Authorization: Bearer <token>"
```

**Request example (Delete for everyone — sender, <1h)**

```bash
curl -X DELETE "http://localhost:5000/api/messages/MSG_ID?scope=everyone" \
  -H "Authorization: Bearer <token>"
```

**Response**

```json
{ "success": true }
```

#### Socket events (client)

- Identify & join room:

```js
socket.emit('online', userId);
socket.emit('joinRoom', { matchId, userId });
```

- Sending flow (recommended):
  1. POST `/api/messages` → get saved message with `_id`.
  2. Emit `sendMessage` to let server mark delivered and broadcast:

```js
socket.emit('sendMessage', { matchId, messageId: savedMsg._id });
socket.on('newMessage', (msg) => { /* add to UI */ });
```

- Mark read:

```js
socket.emit('markAsRead', { matchId, userId });
socket.on('messagesRead', ({ matchId, readerId }) => { /* update UI */ });
```

- Real-time deletion (server emits when `scope=everyone`):

```js
socket.on('messageDeleted', ({ messageId, matchId, deletedForEveryone, message }) => {
  // remove or replace message in UI (message.text will be null)
});
```

Notes:
- The server already filters out messages that are deleted for the requesting user when you call `GET /api/messages/:matchId`.
- `deletedFor` is an array of user IDs — if current user is present, hide the message. `deletedForEveryone: true` indicates the message was removed for all.


---

## Privacy

### `PUT /api/privacy` (protected)

Update privacy settings.

**Request**

```json
{
  "showProfile": true,
  "showOnlineStatus": false,
  "locationPermission": true
}
```

**Response**

```json
{
  "_id": "66af252f89d8c1a88e055f70",
  "user": "66af220f89d8c1a88e055f39",
  "showProfile": true,
  "showOnlineStatus": false,
  "locationPermission": true
}
```

---

## Security

- JWT auth (`Authorization: Bearer <token>`)
- Helmet security headers
- CORS restricted via `CLIENT_ORIGIN`
- Rate limiting on all routes (100 requests / 15 min / IP)
- Mongo sanitize (blocks `$` / `.` injection)
- XSS clean input
- All main routes validated with Zod
- Images stored in Cloudinary only, not on the server's disk
