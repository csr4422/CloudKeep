#!/usr/bin/env bash

_cloudkeep_load_token() {
    local user="${CLOUDKEEP_USER-}"
    local pass="${CLOUDKEEP_PASS-}"
    local response
    local access

    if [[ -z "$user" ]]; then
        read -r -p "CloudKeep username: " user || return 1
    fi

    if [[ -z "$pass" ]]; then
        read -r -s -p "CloudKeep password: " pass || return 1
        printf '\n'
    fi

    if ! response=$(curl --silent --show-error --fail-with-body \
        --header 'Content-Type: application/json' \
        --data "$(python3 -c 'import json,sys; print(json.dumps({"username":sys.argv[1],"password":sys.argv[2]}))' "$user" "$pass")" \
        http://127.0.0.1:8000/api/auth/login/ 2>&1); then
        printf '%s\n' "$response" >&2
        return 1
    fi

    if ! access=$(printf '%s' "$response" | python3 -c 'import json,sys; data=json.load(sys.stdin); token=data.get("access"); sys.exit("Login response does not contain an access token") if not isinstance(token,str) or not token else print(token)' 2>&1); then
        printf '%s\n' "$access" >&2
        return 1
    fi

    export TOKEN="$access"
    printf 'TOKEN set\n'
}

_cloudkeep_load_token
_cloudkeep_status=$?
unset -f _cloudkeep_load_token
return "$_cloudkeep_status" 2>/dev/null || exit "$_cloudkeep_status"
