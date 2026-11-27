'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { resolveShowSwitchPath } from '@/app/lib/show-switcher-helpers'

async function setActiveProductionCookie(productionId: number) {
  const cookieStore = await cookies()
  cookieStore.set('active_production_id', String(productionId), {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function switchProduction(formData: FormData) {
  const rawId = formData.get('productionId')
  const productionId = Number(rawId)
  const tenant = String(formData.get('tenant') || '')
  const currentPath = String(formData.get('redirectPath') || '/')

  if (Number.isInteger(productionId) && productionId > 0) {
    await setActiveProductionCookie(productionId)
  }

  const targetUrl =
    Number.isInteger(productionId) && productionId > 0
      ? resolveShowSwitchPath(currentPath, tenant, productionId)
      : currentPath || '/'

  revalidatePath('/', 'layout')
  redirect(targetUrl)
}

export async function switchProductionDirect(
  productionId: number,
  tenant: string,
  currentPath: string
): Promise<{ ok: boolean; targetUrl: string }> {
  if (!Number.isInteger(productionId) || productionId <= 0) {
    return { ok: false, targetUrl: currentPath || '/' }
  }

  await setActiveProductionCookie(productionId)
  const targetUrl = resolveShowSwitchPath(currentPath, tenant, productionId)
  revalidatePath('/', 'layout')

  return { ok: true, targetUrl }
}
