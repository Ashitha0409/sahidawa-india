// apps/api/src/backend-test.ts

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("🔄 Testing Supabase connection...\n");

  const { data, error } = await supabase
    .from("users") // replace later if table doesn't exist
    .select("*")
    .limit(5);

  if (error) {
    console.error("❌ Supabase Error:");
    console.error(error.message);
    process.exit(1);
  }

  console.log("✅ Connection successful!");
  console.log("📦 Data:");
  console.log(data);
}

testConnection();