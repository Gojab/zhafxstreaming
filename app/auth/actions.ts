'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export interface AuthActionResult {
  error?: string;
  success?: string;
}

export async function login(formData: FormData): Promise<AuthActionResult | void> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData): Promise<AuthActionResult | void> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan kata sandi wajib diisi.' };
  }

  if (password.length < 6) {
    return { error: 'Kata sandi minimal 6 karakter.' };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required and no active session yet
  if (data?.user && !data.session) {
    return {
      success:
        'Pendaftaran berhasil! Silakan periksa email Anda untuk mengonfirmasi akun sebelum masuk.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function updateProfile(formData: FormData): Promise<AuthActionResult> {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();

  if (!name && !email) {
    return { error: 'Nama atau email harus diisi.' };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'Sesi login tidak valid. Silakan masuk kembali.' };
  }

  const updates: { email?: string; data?: { name?: string } } = {};
  let emailChanged = false;

  if (name !== undefined) {
    updates.data = {
      ...(user.user_metadata || {}),
      name,
    };
  }

  if (email && email !== user.email) {
    updates.email = email;
    emailChanged = true;
  }

  const { error } = await supabase.auth.updateUser(updates);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/', 'layout');

  if (emailChanged) {
    return {
      success:
        'Profil diperbarui! Jika Anda mengganti email, silakan cek kotak masuk email baru untuk konfirmasi verifikasi.',
    };
  }

  return { success: 'Profil dan nama berhasil diperbarui!' };
}

