# Mod Configuration

This context describes the 3DMigoto configuration concepts that PeakyModManager reads and may eventually edit.

## Language

**3DMigoto document**:
A single physical INI source file consumed by 3DMigoto or its XXMI fork.
_Avoid_: Plain INI, config map

**Preamble**:
The directives before the first section of a 3DMigoto document, notably `namespace` and `condition`.
_Avoid_: Global section

**Command-list section**:
A section whose ordered entries form an executable 3DMigoto command program rather than an unordered settings map.
_Avoid_: Script section, commands map

**Resource reference**:
A symbolic address for a custom resource, resource pool element, or graphics-pipeline slot.
_Avoid_: File path, texture name

**Key binding**:
A `[Key*]` section that binds one or more input keys to ordered variable assignments or commands. Its behavior may
be press, hold, toggle, or cycle.
_Avoid_: Toggle key

**Variable assignment**:
A value or value sequence written by a key binding or command to a named variable such as `$hair`.
_Avoid_: Constant

**Texture override**:
A `[TextureOverride*]` section combining match metadata with an ordered command list that may bind resources.
_Avoid_: Texture, resource list

**Resource binding**:
An ordered command that copies, references, clears, or otherwise assigns a resource to a pipeline slot, custom
resource, or pool member.
_Avoid_: Resource

**SlotFix**:
ZZMI's shared texture-slot routing library, which identifies game resources and binds mod-provided resources to the slots expected by each draw.
_Avoid_: Texture override, slot parser
