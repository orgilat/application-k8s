{{/*
Chart name
*/}}
{{- define "automation.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Full resource name
*/}}
{{- define "automation.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "automation.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "automation.labels" -}}
app.kubernetes.io/name: {{ include "automation.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "automation.selectorLabels" -}}
app.kubernetes.io/name: {{ include "automation.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}