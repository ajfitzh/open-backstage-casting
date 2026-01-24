'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function switchProduction(formData: FormData) {
  const productionId = formData.get('productionId') as string
  
  // 1. Set the cookie so the rest of the app knows which show is active
  // We set it for 7 days
  ;(await
    // 1. Set the cookie so the rest of the app knows which show is active
    // We set it for 7 days
    cookies()).set('active_production_id', productionId, { 
    path: '/',
    maxAge: 60 * 60 * 24 * 7 
  })

  // 2. Refresh the page so the new data loads
  redirect('/') 
}