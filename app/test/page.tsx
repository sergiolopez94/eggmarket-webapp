'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-foreground">ShadCN Test Page</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>This is a card description</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Card content with muted text</p>
              <Button className="mt-4">Primary Button</Button>
              <Button variant="secondary" className="ml-2">Secondary Button</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colors Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge>Default Badge</Badge>
              <Badge variant="secondary">Secondary Badge</Badge>
              <Badge variant="destructive">Destructive Badge</Badge>
              <div className="p-4 bg-primary text-primary-foreground rounded">
                Primary background with primary foreground text
              </div>
              <div className="p-4 bg-secondary text-secondary-foreground rounded">
                Secondary background with secondary foreground text
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}