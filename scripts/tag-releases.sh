#!/usr/bin/env bash
# Tag every released version of the add-on.
#
# A release is a commit that changed `version:` in zroshua/config.yaml — that
# field is what Home Assistant's Supervisor uses to offer an update. This
# script tags the first commit that introduced each version, annotating it with
# that version's section of the changelog. Existing tags are left alone, so it
# is safe to re-run after each release.
#
#   bash scripts/tag-releases.sh          # create the missing tags
#   bash scripts/tag-releases.sh --push   # ...and push them to origin
#
# Versions before 0.1.15 predate the first commit and have no commit to point
# at; they live in the changelog only.
set -euo pipefail

cd "$(dirname "$0")/.."
CONFIG=zroshua/config.yaml
CHANGELOG=zroshua/CHANGELOG.md
push=false
[ "${1:-}" = "--push" ] && push=true

# The changelog section for a version: everything from "## <version>" up to the
# next "## " heading.
changelog_section() {
  awk -v want="## $1" '
    $0 == want { grab = 1; next }
    grab && /^## / { exit }
    grab { print }
  ' "$CHANGELOG"
}

created=0
seen=""
# oldest first, so the first sighting of a version is the commit that shipped it
for sha in $(git log --reverse --format=%H -- "$CONFIG"); do
  version=$(git show "$sha:$CONFIG" | sed -n 's/^version:[[:space:]]*"\{0,1\}\([0-9.]*\)"\{0,1\}.*/\1/p')
  [ -n "$version" ] || continue
  case " $seen " in *" $version "*) continue ;; esac
  seen="$seen $version"

  tag="v$version"
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then continue; fi

  { printf 'Zroshua %s\n\n' "$version"; changelog_section "$version"; } |
    git tag -a "$tag" "$sha" -F -
  echo "tagged $tag -> $(git rev-parse --short "$sha")"
  created=$((created + 1))
done

echo "$created tag(s) created"
if [ "$push" = true ] && [ "$created" -gt 0 ]; then
  git push origin --tags
fi
