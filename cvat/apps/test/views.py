from django.db.models import Count, F
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from cvat.apps.access_tokens.permissions import PolicyEnforcer
from cvat.apps.engine.models import LabeledShape, Task
from cvat.apps.engine.permissions import TaskPermission


class TaskAnnotationCountsView(GenericViewSet):
    permission_classes = [PolicyEnforcer]
    iam_permission_class = TaskPermission
    detail = True
    action = "annotations"

    def annotations(self, request, task_id):
        task = get_object_or_404(Task, pk=task_id)

        self.check_object_permissions(request, task)

        qs_counts = (
            LabeledShape.objects
            .filter(job__segment__task=task)
            .values(label_name=F("label__name"))
            .annotate(count=Count("id"))
            .order_by("label_name")
        )

        return Response({
            "task_id": task.id,
            "counts": {
                item["label_name"]: item["count"]
                for item in qs_counts
            },
        })