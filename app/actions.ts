'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function switchProduction(formData: FormData) {
  const productionId = formData.get('productionId')
  // 1. Capture the path the user is currently on
  const path = formData.get('redirectPath') as string || '/'

  if (productionId) {
     const cookieStore = await cookies()
     // Set the cookie
     cookieStore.set('active_production_id', productionId.toString())
  }

  // 2. Revalidate the specific page so it re-fetches data with the new ID
  revalidatePath(path)
  
  // 3. Redirect back to the same page
  redirect(path)
}