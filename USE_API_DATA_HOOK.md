# useApiData Hook Documentation

## Overview

The `useApiData` hook is a custom React hook that leverages TanStack Query's `useQuery` to fetch data from Next.js API routes via the extension's background script. This hook provides a clean and efficient way to handle API requests in content scripts while maintaining separation of concerns.

## How It Works

1. The hook uses TanStack Query's `useQuery` for data fetching, caching, and state management
2. It sends a message to the background script using `chrome.runtime.sendMessage`
3. The background script handles the actual HTTP request to the Next.js API
4. The response is sent back to the content script through the message passing system

## Installation

The hook requires the following dependencies which should already be installed in your project:

- `@tanstack/react-query`
- `react`

## Usage

### 1. Using the Hook in a Component (GET Request)

```tsx
import React from 'react'
import { useApiData } from '@/hooks/useApiData'

interface UserData {
  id: number
  name: string
  email: string
}

const UserProfile: React.FC = () => {
  const { data, isLoading, error, refetch } = useApiData<UserData>('/api/users/1')

  if (isLoading) {
    return <div>Loading user data...</div>
  }

  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  return (
    <div>
      <h2>User Profile</h2>
      {data?.data ? (
        <div>
          <p>ID: {data.data.id}</p>
          <p>Name: {data.data.name}</p>
          <p>Email: {data.data.email}</p>
        </div>
      ) : (
        <p>No user data available</p>
      )}
      <button onClick={() => refetch()}>Refresh Data</button>
    </div>
  )
}

export default UserProfile
```

### 2. POST Request with Manual Trigger

```tsx
import React, { useState } from 'react'
import { useApiData } from '@/hooks/useApiData'

interface User {
  id: number
  name: string
  email: string
}

interface CreateUserPayload {
  name: string
  email: string
}

const CreateUserForm: React.FC = () => {
  const [userData, setUserData] = useState({ name: '', email: '' })
  
  const { 
    isLoading, 
    error, 
    refetch: createUser 
  } = useApiData<User>(
    '/api/users',
    { enabled: false }, // Disable automatic fetching
    {
      method: 'POST',
      body: userData
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createUser()
      console.log('User created:', result.data)
    } catch (err) {
      console.error('Failed to create user:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={userData.name}
        onChange={(e) => setUserData({...userData, name: e.target.value})}
        placeholder="Name"
      />
      <input
        type="email"
        value={userData.email}
        onChange={(e) => setUserData({...userData, email: e.target.value})}
        placeholder="Email"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  )
}
```

### 3. Passing Parameters

You can pass parameters to your API endpoints by including them in the endpoint string:

```tsx
const { data, isLoading, error } = useApiData<ProductData>(`/api/products/${productId}`)
```

### 4. Using Query Options

The hook accepts TanStack Query options as the second parameter:

```tsx
const { data, isLoading, error } = useApiData<UserData>(
  '/api/users/1',
  {
    enabled: !!userId, // Only fetch when userId exists
    retry: 3, // Retry failed requests up to 3 times
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  }
)
```

### 5. Using Fetch Options

The hook accepts fetch options as the third parameter:

```tsx
const { data, isLoading, error, refetch } = useApiData<UserData>(
  '/api/users',
  { enabled: false }, // Disable automatic fetching for manual trigger
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'value'
    },
    body: {
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
)

// Manually trigger the request
const handleCreateUser = async () => {
  const result = await refetch()
  console.log(result.data)
}
```

## Background Script Integration

The background script (`background.ts`) must be configured to handle the `FETCH_API_DATA` message type. This is already set up in your project.

## API Response Format

The API response is expected to follow this format:

```ts
interface ApiResponse<T> {
  data: T
  error?: string
  success: boolean
}
```

Your Next.js API routes should return responses in this format:

```ts
// Example Next.js API route
export default function handler(req, res) {
  res.status(200).json({
    success: true,
    data: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    }
  })
}
```

## Error Handling

The hook provides comprehensive error handling:
- Network errors
- API errors (non-2xx responses)
- Background script communication errors

## Benefits

1. **Separation of Concerns**: API requests are handled by the background script, not content scripts
2. **Caching**: Built-in caching through TanStack Query
3. **Error Handling**: Automatic retry and error state management
4. **Type Safety**: Full TypeScript support with generic types
5. **Loading States**: Built-in loading state management
6. **Refetching**: Easy manual refetching capability
7. **Authentication**: Automatic inclusion of auth tokens from storage
8. **Flexible HTTP Methods**: Support for GET, POST, PUT, DELETE, etc.

## Requirements

1. Next.js API routes running on `localhost:3001`
2. Proper manifest configuration for background script messaging
3. TanStack Query provider in your React component tree

## Troubleshooting

1. **No response from background script**: Ensure the background script is properly registered in your manifest
2. **CORS errors**: Make sure your Next.js API allows requests from your extension
3. **404 errors**: Verify your API endpoint path is correct
4. **Authentication issues**: Check that the user is properly logged in and tokens are stored