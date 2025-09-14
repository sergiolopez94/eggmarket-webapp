'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent } from '@/components/ui/card'

export default function DebugPage() {
  const { user, profile, loading, signOut } = useAuth()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug: Auth State</h1>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Loading State</h3>
            <p>{loading ? 'TRUE (Loading...)' : 'FALSE (Not loading)'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">User Object</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded mt-2">
              {user ? JSON.stringify(user, null, 2) : 'null'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Profile Object</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded mt-2">
              {profile ? JSON.stringify(profile, null, 2) : 'null'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold">Actions</h3>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Force Sign Out
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}