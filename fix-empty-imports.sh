#!/bin/bash
sed -i '/import {  } from '\''@\/src\/utils\/'\''/d' src/pages/ForgotPassword.tsx
sed -i '/import {  } from '\''@\/src\/utils\/'\''/d' src/pages/ResetPassword.tsx
