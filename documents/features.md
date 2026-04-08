# AccordCRM - Complete Feature List

## 1. Authentication & Authorization

### 1.1 Login System
- Separate login pages for Agent (`/login/agent`) and Admin (`/login/admin`) roles
- Email and password credential submission
- Session-based authentication with cookies
- Token verification using session secrets
- localStorage persistence of user state
- Auto-session verification on app load

### 1.2 Role-Based Access Control
- Two user roles: **Agent** and **Admin**
- Root admin designation (`isRootAdmin` flag) — root admin cannot be deleted
- Role-based route guards that redirect unauthorized users
- Different navigation menus and dashboard views per role
- Agents can only see their own client activities
- Admins can see activities of all agents

### 1.3 Authentication Context
- `AuthProvider` context with login/logout functionality
- `useAuth` hook for accessing user state from any component

---

## 2. Agent Dashboard

- Personalized welcome greeting with agent name
- Statistics cards displaying:
  - Total Clients
  - Accounts Opened
  - Transactions Today
- Quick-action "Create Client" button
- Activity Timeline showing the agent's recent activities
- Real-time statistics calculated from client, account, transaction, and activity data

---

## 3. Admin Dashboard

- Personalized welcome greeting with admin name
- Statistics cards displaying:
  - Total Agents
  - Total Clients
- Recent Agents table (name, email, phone, creation date — limited to 3 most recent)
- Activity Timeline showing activities across all agents
- Separate root admin dashboard route (`/admin/root/dashboard`)

---

## 4. Client Profile Management

### 4.1 Create Client (`/agent/clients/new`)
- Comprehensive form with real-time field-level validation:
  - **First Name** — 2-50 characters, letters/spaces/hyphens/apostrophes only
  - **Last Name** — same rules as first name
  - **Date of Birth** — must be 18-120 years old, cannot be a future date
  - **Identification Number** — country-aware identity card validation (powered by validator.js + custom rules)
  - **Gender** — Male, Female, Non-binary, Prefer not to say
  - **Email** — valid format, unique across the system
  - **Phone Number** — international format, 10-15 digits
  - **Address Line 1 & 2** — 5-100 characters (line 2 optional)
  - **City** — 2-50 characters
  - **State** — 2-50 characters
  - **Postal Code** — Singapore 6-digit format
  - **Country**
- Touched-field tracking (errors only shown after interaction)
- Unsaved changes confirmation modal on navigation away
- Auto-assignment of new client to the creating agent
- Toast notifications for success and failure

### 4.2 View Clients (`/agent/clients`)
- Paginated table (10 items per page) with columns:
  - Name, Email, Phone, Date of Birth, Accounts count, Verified status, Created date
- Columns adapt when detail panel is open (DOB and Created date hidden)
- Click a row to open the detail side panel
- Verification badge (checkmark or X icon)
- URL-based state for selected client (`?client=id`)
- "Preview Form" button to show form structure via modal

### 4.3 Client Detail Panel
- Slide-out drawer from the right side with animation
- Displays client name with verification badge
- Contact information (email, phone)
- Account information section:
  - Number of accounts
  - Account cards showing status (Active/Inactive), opened date, account number, balance
- "View Full Profile" button linking to the full detail page
- Close button with animated transition

### 4.4 Client Detail Page (`/agent/clients/[id]`)
- Full client profile view with all personal and account information

### 4.5 Delete Client
- Confirmation modal listing consequences:
  - Permanent deletion
  - Pending transactions cancelled
  - Action cannot be undone
- Toast notification on successful deletion
- Automatically closes detail panel and refreshes list

### 4.6 Client Form Preview Modal
- Displays the structure of the client creation form
- Accessible from the clients list page via "Preview Form" button

---

## 5. Transaction Management (`/agent/transactions`)

### 5.1 Transaction List
- Filterable table with:
  - **Client ID** filter
  - **Transaction Type** filter (Deposit, Withdrawal)
  - **Status** filter (Completed, Pending, Failed)
  - **Date Range** filter (From / To)
- Pagination (10 items per page)
- Table columns: ID, Client, Account, Type (with directional icons), Amount (SGD), Date, Status, Actions
- Visual indicators:
  - Deposit: green down-arrow icon
  - Withdrawal: red up-arrow icon
  - Status badges: green (Completed), yellow (Pending), red (Failed)
- Action buttons: View Details (eye icon), Retry failed transactions (refresh icon)

### 5.2 Transaction Details Drawer
- Slide-out panel from the right side
- Displays transaction amount with type icon
- Status badge
- Full details: Transaction ID, Client Name, Client ID, Account ID, Account Type, Date & Time, Description
- Retry button for failed transactions

---

## 6. Activity & Interaction Logging

### 6.1 Activity Logging System
- Tracks action types: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACTIVATE, DEACTIVATE, APPROVE, REJECT
- Entity types: USER, TRANSACTION, CLIENT, ACCOUNT, REQUEST, CASE
- Each log entry records:
  - User ID (who performed the action)
  - Action type and entity type/ID
  - Timestamp (ISO 8601)
  - Action status (SUCCESS / FAILURE)
  - Error messages (if applicable)
  - Reason for action
  - Attribute changes (before/after values)
  - Source service

### 6.2 Activity Logs Page (Agent — `/agent/activities`)
- Shows only the logged-in agent's activities
- Filtering by:
  - Action (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACTIVATE, DEACTIVATE, APPROVE, REJECT)
  - Entity Type (USER, TRANSACTION, CLIENT, ACCOUNT, REQUEST, CASE)
  - Status (SUCCESS, FAILURE)
  - Date Range (From / To)
- Pagination (10 items per page)
- Search and Clear Filters buttons

### 6.3 Activity Logs Page (Admin — `/admin/activities`)
- Shows activities across all agents
- Same filtering and pagination capabilities as the agent view

### 6.4 Activity Details Drawer
- Slide-out panel showing:
  - Action summary with entity name
  - Timestamp
  - Entity ID
  - Action type and status
  - Change details (before/after values for each attribute)
  - Reason and error messages (if applicable)
  - Link to view associated client profile

### 6.5 Activity Timeline Component
- Reusable component on dashboards
- Groups related activity logs
- Links to client profiles and transaction details
- Displays action, entity, timestamp, and status badges

---

## 7. Admin Agent Management (`/admin/agents`)

- List of all agents with their details
- Viewable by admin users

---

## 8. Settings (`/agent/settings`)

### 8.1 Profile Information
- Avatar with user initials
- Full name display
- Email address
- Role (capitalized)
- User ID

### 8.2 Appearance
- Dark mode toggle switch
- Light/dark theme icons for visual indication

---

## 9. Navigation & Layout

### 9.1 Agent Sidebar
- Dashboard
- Clients
- Transactions
- Activity Logs
- Settings

### 9.2 Admin Sidebar (Regular)
- Admin Dashboard
- Agents
- Activity Logs

### 9.3 Admin Sidebar (Root Admin)
- Admin Dashboard
- Agents
- Activity Logs
- Settings

### 9.4 Sidebar Features
- Active route highlighting
- Logo with role indicator ("(root admin)" for root admins)
- User initials avatar
- User info display (name, email)
- Logout button

---

## 10. UI/UX Features

### 10.1 Theme System
- Light and Dark mode
- `ThemeProvider` context for state management
- localStorage persistence (`accord-crm-theme`)
- System preference detection (`prefers-color-scheme`)
- Dark mode applied via `dark` class on the HTML element

### 10.2 Responsive Design
- Grid layouts adapting from 1 to 3 columns based on screen size
- Mobile-first approach
- Responsive tables with horizontal overflow handling
- Forms adjust between 1 and 2 column layouts

### 10.3 Toast Notifications
- Success toasts (e.g. client created, client deleted)
- Error toasts (e.g. failed to load data, invalid credentials)
- Sonner library with rich color mode
- Positioned top-right

### 10.4 Modals & Drawers
- Confirmation modals (discard unsaved changes, delete confirmation)
- Slide-in drawers from the right side with 300ms animated transitions
- Overlay backdrop when drawer is open
- Close via button or Escape key

### 10.5 Form Components
- Rounded input fields (`rounded-xl`)
- Label-input pairs with error message display (red text)
- Required field indicators (red asterisk)
- Phone number input with international format support
- Select dropdowns (Radix UI)
- Disabled button states during form submission

### 10.6 Icons & Visual Indicators
- Lucide icons for navigation and actions
- Colored status badges
- Verification badges (checkmark / X)
- Transaction type directional arrows
- Account status indicators

---

## 11. Data Filtering & Pagination

### 11.1 FilterCard Component
- Configurable filter types: Select dropdowns, Date inputs
- Placeholder text per field
- Reused across transactions and activities pages

### 11.2 PaginationBar Component
- Current page / total pages display
- Previous / Next navigation buttons
- Item count with singular/plural label support
- Customizable item label text

### 11.3 useFilteredData Hook
- Generic hook for filtering and paginating any dataset
- Maintains filter state and applied filter values
- Returns paginated data slice
- Methods: `handleFilterChange`, `handleSearch`, `handleClear`

### 11.4 Pagination Strategy
- 10 items per page (default)
- Backend pagination for clients (API-level)
- Frontend pagination for transactions and activities

---

## 12. API Integration

### 12.1 API Clients
- **Clients API** — GET all, GET by ID, GET by agent ID (paginated), GET count, CREATE, UPDATE, DELETE
- **Users API** — GET all users
- **Accounts API** — GET all accounts
- **Transactions API** — GET all transactions
- **Activity Logs API** — GET all, GET by user ID

### 12.2 API Proxy
- Next.js proxy route for forwarding requests to external backend services

### 12.3 Error Handling
- Toast notifications for API errors
- `Promise.allSettled` for parallel requests with graceful fallback
- Empty array fallbacks on request failure

---

## 13. Data Formatting & Transformation

### 13.1 Formatters (`src/lib/formatters.ts`)
- Currency formatting (USD for client pages, SGD for transaction pages)
- Date formatting (multiple locale and format options)
- Time formatting
- Full timestamp formatting (day, month, year, hour, minute)

### 13.2 API Transformers
- API response to frontend type mapping for:
  - Clients
  - Transactions
  - Activity Logs

---

## 14. Shared Utilities & Hooks

- `src/lib/activity-utils.ts` — `GroupedActivityLog` type, `groupActivityLogs()`, display helpers
- `src/lib/constants.ts` — shared status style maps and label maps
- `src/hooks/use-drawer.ts` — reusable drawer open/close/escape animation hook
- `src/hooks/use-filtered-data.ts` — generic filtering and pagination hook

---

## 15. Type Safety

- Full TypeScript interfaces for User, Client, Transaction, ActivityLog
- API request/response DTOs
- Filter interfaces per page
- Strict typing throughout the application

---

## 16. Accessibility

- Form labels linked with `htmlFor`
- `aria-invalid` on form fields with errors
- `aria-describedby` linking fields to error messages
- Semantic HTML elements
- `aria-label` on icon-only buttons
- Role attributes on custom interactive components

---

## 17. State Management

- **Context Providers**: `AuthProvider`, `ThemeProvider`
- **localStorage** for session and theme persistence
- **React hooks**: `useState`, `useMemo`, `useCallback`, `useEffect` for component-level state
- **URL search parameters** for shareable filter/selection state

---

## 18. Error Handling & Loading States

- Loading spinners during data fetches
- Empty state messages when no results match filters
- Disabled buttons during form submission to prevent double-submit
- Try-catch error handling on all API calls
- Toast error messages for user-facing failures
