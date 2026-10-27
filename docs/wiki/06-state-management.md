# 06 — State Management

**Quick pick:** If the data lives on the server and only needs to render — use an async Server Component. If the user is mutating something — use a Server Action. If the data changes client-side after the initial render — use TanStack Query. If it is UI state (open/closed, active tab) — use Zustand. Everything else is an anti-pattern.

---

## 1. Decision Matrix

| Scenario | Tool | Example |
|---|---|---|
| Initial page data | async Server Component | User list, product catalog |
| Mutations | Server Actions | Form submit, add to cart |
| Client-side cache / optimistic UI | TanStack Query | Search results, infinite scroll |
| SSR + client handoff | TanStack Query `HydrationBoundary` | Pre-fetched data that needs client refresh |
| Global UI state | Zustand | Sidebar open, theme, modal visibility |
| Form state | Native `<form>` + Server Actions | Login form, settings form |

When in doubt, reach for the tool furthest up this list that fits. Async Server Components are the default and preferred approach — they add no client-side JavaScript of their own, no caching configuration, and no extra abstraction.

### Where the providers live

`StoreProvider` (Zustand) and `QueryProvider` (TanStack Query) are mounted **only** in `app/(app)/(interactive)/layout.tsx`. The `(app)` shell and the `(auth)` pages have no providers, so read-only routes do not ship their code ([ADR-009](../adr/009-framework-and-js-floor.md)).

| Route location | `useUIStore` / `usePermission` | TanStack Query hooks |
|---|---|---|
| `app/(app)/(interactive)/…` | Work | Work |
| `app/(app)/…` (read-only) | Throw | Throw (no `QueryClient`) |
| `app/(auth)/…` | Throw | Throw (no `QueryClient`) |

`useUIStore` throws `useUIStore must be used within StoreProvider` when no provider is above it. `usePermission` calls `useUIStore`, so it throws in the same places. If you see that error, move the route into `(interactive)` (the URL does not change), or remove the client state from the page.

Async Server Components, Server Actions and native forms need no provider. They work in every group.

---

## 2. Server Components — Initial Page Data

Server Components are `async` functions. They fetch data directly — no `useEffect`, no client libraries, no hooks. The result is static HTML delivered to the browser with zero hydration cost.

This is the default rendering approach in furio-kit. Always start here.

```tsx
// src/entities/user/ui/UserList.tsx
import { getUsers } from '@/entities/user'

export async function UserList() {
  const users = await getUsers()

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

The data fetching function in `entities/user/api/` must parse the response through a Zod schema before returning:

```ts
// src/entities/user/api/get-users.ts
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

const UsersSchema = z.array(UserSchema)
export type User = z.infer<typeof UserSchema>

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${process.env.API_URL}/users`, { next: { revalidate: 60 } })
  const data = await res.json()
  return UsersSchema.parse(data)
}
```

Wrap `UserList` in a `<Suspense>` boundary at the view or widget layer to enable streaming:

```tsx
// src/views/users/UsersView.tsx
import { Suspense } from 'react'
import { UserList } from '@/entities/user'

export function UsersView() {
  return (
    <Suspense fallback={<p>Loading users…</p>}>
      <UserList />
    </Suspense>
  )
}
```

---

## 3. Server Actions — Mutations

Server Actions are `"use server"` functions that run on the server and can be called directly from Client Component event handlers or native `<form>` `action` props.

Always validate input with Zod before touching any data layer. Call `revalidatePath()` or `revalidateTag()` to invalidate cached pages after a successful mutation.

```ts
// src/features/create-user/actions/create-user-action.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const CreateUserInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export async function createUserAction(formData: FormData) {
  const input = CreateUserInput.parse({
    name: formData.get('name'),
    email: formData.get('email'),
  })

  await db.user.create({ data: input })

  revalidatePath('/users')
}
```

Call the action from a Client Component form:

```tsx
// src/features/create-user/ui/CreateUserForm.tsx
'use client'

import { createUserAction } from '../actions/create-user-action'

export function CreateUserForm() {
  return (
    <form action={createUserAction}>
      <input name="name" type="text" required />
      <input name="email" type="email" required />
      <button type="submit">Create user</button>
    </form>
  )
}
```

---

## 4. TanStack Query — Client-Side Cache and Optimistic UI

Use TanStack Query when data must change after the initial render without a full navigation: search results, paginated lists, polling, or optimistic updates.

### Basic `useQuery`

```tsx
// src/features/user-search/ui/UserSearch.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { searchUsers } from '@/entities/user'

export function UserSearch({ query }: { query: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers(query),
    enabled: query.length > 2,
  })

  if (isPending) return <p>Searching…</p>
  if (isError) return <p>Something went wrong.</p>

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

### SSR Handoff with `HydrationBoundary`

Pre-fetch data in a Server Component to avoid a client waterfall, then hand it off to TanStack Query so the client can refresh it without re-fetching on mount.

```tsx
// src/views/users/UsersView.tsx  (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { getUsers } from '@/entities/user'
import { UserListClient } from './UserListClient'

export async function UsersView() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserListClient />
    </HydrationBoundary>
  )
}
```

```tsx
// src/views/users/UserListClient.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { getUsers } from '@/entities/user'

export function UserListClient() {
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

`QueryProvider` is already mounted in `app/(app)/(interactive)/layout.tsx`, so no extra setup is needed for routes in that group. Put routes that use TanStack Query under `(interactive)`. In the read-only `(app)` group, `useQuery` throws because there is no `QueryClient`.

---

## 5. Zustand — Global UI State

Zustand manages UI-only state: sidebar visibility, active tab, modal open/closed, theme preference. It never holds server-fetched data.

### Store definition

The store uses a factory function so each SSR request gets its own isolated instance.

```ts
// src/shared/model/ui-store.ts
import { createStore } from 'zustand'

export interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export const createUIStore = () =>
  createStore<UIState>()((set) => ({
    sidebarOpen: false,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  }))

export type UIStore = ReturnType<typeof createUIStore>
```

`StoreProvider` uses `useRef` to ensure a single store instance per render tree, preventing state leaking across SSR requests:

```tsx
// src/shared/providers/StoreProvider.tsx  (simplified)
'use client'

import { useRef } from 'react'
import { createUIStore, UIStore } from '@/shared/model/ui-store'
import { UIStoreContext } from './ui-store-context'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<UIStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = createUIStore()
  }
  return (
    <UIStoreContext.Provider value={storeRef.current}>
      {children}
    </UIStoreContext.Provider>
  )
}
```

### Reading state

Use `useUIStore` from `@/shared/providers` — never import the store or context directly from `shared/model`. The component must render under a route in `app/(app)/(interactive)/`:

```tsx
// src/features/sidebar-toggle/ui/SidebarToggle.tsx
'use client'

import { useUIStore } from '@/shared/providers'
import { Button } from '@/shared/ui'

export function SidebarToggle() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <Button onClick={toggleSidebar}>
      {sidebarOpen ? 'Close' : 'Open'} sidebar
    </Button>
  )
}
```

Do not call `useUIStore` from the `Header` widget or anything else rendered by `app/(app)/layout.tsx`. That shell sits above `(interactive)` and has no `StoreProvider`.

Select only the slice of state each component needs. Selecting the whole store object causes unnecessary re-renders.

---

## 6. Per-Slice Zustand Stores

When a slice (feature, widget) needs UI state that is not shared globally, create a store scoped to that slice instead of adding it to the global `UIState` in `shared/model/ui-store.ts`.

### When to use a per-slice store

- The state is only relevant within one feature or widget (e.g., a multi-step form, a local filter panel, a cart drawer).
- Adding it to `UIState` would pollute the global store with state that 90% of the app never needs.
- The state needs to reset when the slice unmounts.

### Pattern

Follow the same factory + `useRef` + context pattern as the global store:

```ts
// src/features/cart/model/cart-store.ts
import { createStore } from 'zustand'

export interface CartState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const createCartStore = () =>
  createStore<CartState>()((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
  }))

export type CartStore = ReturnType<typeof createCartStore>
```

Provide it with a scoped provider in the slice's layout or root component:

```tsx
// src/features/cart/ui/CartProvider.tsx
'use client'
import { useRef } from 'react'
import { createCartStore, CartStore } from '../model/cart-store'
import { CartStoreContext } from './cart-store-context'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<CartStore | null>(null)
  if (!storeRef.current) storeRef.current = createCartStore()
  return (
    <CartStoreContext.Provider value={storeRef.current}>
      {children}
    </CartStoreContext.Provider>
  )
}
```

Consume via a `useCartStore` hook that reads from the context — the same pattern as `useUIStore` in `shared/providers`.

A slice provider is independent of `StoreProvider`, so it works in any route group. It still ships Zustand to that route, so check `pnpm check:budget` if you use one in a read-only route.

### What stays in the global store

The global `UIState` in `shared/model/ui-store.ts` is for state shared across multiple slices (e.g., sidebar open/closed, global theme, session user). Anything that only one slice needs goes in a slice store.

---

## 7. Anti-Patterns

### Fetching in Client Components for the initial render

```tsx
// BAD — forces a client-side waterfall; user sees empty shell then data
'use client'

export function UserList() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    fetch('/api/users').then((r) => r.json()).then(setUsers)
  }, [])
  return <ul>{users.map(...)}</ul>
}

// GOOD — render the data immediately; no JavaScript required
export async function UserList() {
  const users = await getUsers()
  return <ul>{users.map(...)}</ul>
}
```

### Storing API responses in Zustand

```ts
// BAD — Zustand is for UI state; this duplicates server cache and goes stale
const useStore = create((set) => ({
  users: [],
  fetchUsers: async () => {
    const users = await getUsers()
    set({ users })
  },
}))

// GOOD — use TanStack Query, which manages caching, revalidation, and deduplication
const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers })
```

### `useEffect` for data fetching

```tsx
// BAD — useEffect runs after paint; user sees a flash of empty content
useEffect(() => { fetchData().then(setData) }, [])

// GOOD — async Server Component; data is available before the first byte is sent
export async function MyComponent() {
  const data = await fetchData()
  return <div>{data.value}</div>
}
```

### Placing `"use client"` on widgets or views

```tsx
// BAD — makes the entire widget tree a Client Component, including data fetching
'use client'
export function DashboardWidget() { ... }

// GOOD — keep the widget as a Server Component; push "use client" to the
// interactive leaf (a button, a form, a dropdown) that actually needs it
export function DashboardWidget() {
  return (
    <section>
      <DashboardData />     {/* Server Component — fetches data */}
      <FilterControls />    {/* Client Component — handles user input */}
    </section>
  )
}
```

Marking a component `"use client"` propagates to all its children. Push this boundary as deep as possible to maximise the amount of server-rendered HTML and minimise the client bundle.
