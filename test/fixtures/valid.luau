-- Strings and comments must remain intact under conservative transforms.
local greeting = "local greeting"
local data = { key = greeting, ["fixed"] = 5 }

for i = 1, 3 do
    if data.key then
        print(greeting, i)
    end
end
