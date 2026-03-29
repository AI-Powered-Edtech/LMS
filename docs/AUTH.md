# EduSync LMS — Authentication Guide

## Overview

EduSync uses Supabase email/password authentication. All auth flows go through `supabase.auth.signInWithPassword()`. Mock sessions or fake JWTs are strictly forbidden — they break RLS and FK constraints.

## How Auth Works
