-- usage: lua tools/eval_lua_to_json.lua <module.lua> <out.json>
local in_path  = arg[1]
local out_path = arg[2] or (in_path .. ".json")

local ok, dkjson = pcall(require, "dkjson")
if not ok then io.stderr:write("dkjson not found\n"); os.exit(1) end

local function sandbox_env()
  return {
    pairs=pairs, ipairs=ipairs, next=next,
    type=type, tostring=tostring, tonumber=tonumber,
    string=string, table=table, math=math
  }
end

local chunk, err = loadfile(in_path, "t", sandbox_env())
if not chunk then io.stderr:write("load error: "..tostring(err).."\n"); os.exit(2) end

local ok2, res = pcall(chunk)
if not ok2 then io.stderr:write("run error: "..tostring(res).."\n"); os.exit(3) end
if type(res) ~= "table" then io.stderr:write("module did not return a table\n"); os.exit(4) end

local json = dkjson.encode(res, { indent = false })
local f = assert(io.open(out_path, "w"))
f:write(json)
f:close()
print("✓ wrote "..out_path)
