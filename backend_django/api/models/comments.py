from django.db import models
from django.contrib.auth.models import User

from .project import Checkpoint


class CheckpointComment(models.Model):
    """Threaded comments on compliance checkpoints for collaboration."""
    checkpoint = models.ForeignKey(Checkpoint, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checkpoint_comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self) -> str:
        return f"Comment by {self.user.username} on {self.checkpoint.label[:30]}"
