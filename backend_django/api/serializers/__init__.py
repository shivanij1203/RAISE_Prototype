"""DRF Serializers for the RAISE Ethics Tool API.

NOTE: The frontend currently expects camelCase keys, and the views use
manual dict serialization (serialize_project, serialize_ai_tool) to
produce that format. Proper ModelSerializer classes will be introduced
in a follow-up step with a camelCase renderer or explicit field mapping.

For now this package is a placeholder that future serializer modules
(auth.py, project.py, tools.py, comments.py) will be added to.
"""
