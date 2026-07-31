{{/*
Expand the name of the chart.
*/}}
{{- define "exposure.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "exposure.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "exposure.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "exposure.labels" -}}
app.kubernetes.io/name: {{ include "exposure.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "exposure.selectorLabels" -}}
app.kubernetes.io/name: {{ include "exposure.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}