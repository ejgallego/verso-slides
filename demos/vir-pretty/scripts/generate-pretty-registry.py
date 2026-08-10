#!/usr/bin/env python3
"""Generate a deck-resident Std.Format table and attach its numeric IDs."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any


RICH_FORMAT = re.compile(r'data-rich-format="([^"]*)"')


def compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def lean_string(value: str) -> str:
    pieces = ['"']
    for char in value:
        code = ord(char)
        if char == "\\":
            pieces.append("\\\\")
        elif char == '"':
            pieces.append('\\"')
        elif char == "\n":
            pieces.append("\\n")
        elif char == "\r":
            pieces.append("\\r")
        elif char == "\t":
            pieces.append("\\t")
        elif code < 0x20 or code == 0x7F:
            pieces.append(f"\\u{{{code:x}}}")
        else:
            pieces.append(char)
    pieces.append('"')
    return "".join(pieces)


def format_expr(value: Any) -> str:
    if value is None:
        return "Std.Format.nil"
    if isinstance(value, str):
        return f"Std.Format.text {lean_string(value)}"
    if value == 1 and not isinstance(value, bool):
        return "Std.Format.line"
    if not isinstance(value, list) or not value:
        raise ValueError(f"invalid compact Std.Format node: {value!r}")

    tag = value[0]
    if tag == 2 and len(value) == 2 and isinstance(value[1], bool):
        return f"Std.Format.align {str(value[1]).lower()}"
    if tag == 3 and len(value) == 3 and isinstance(value[1], int) and value[1] >= 0:
        return f"Std.Format.nest {value[1]} ({format_expr(value[2])})"
    if tag == 4 and len(value) == 3:
        return f"Std.Format.append ({format_expr(value[1])}) ({format_expr(value[2])})"
    if tag in (5, 6) and len(value) == 2:
        behavior = "allOrNone" if tag == 5 else "fill"
        return f"Std.Format.group ({format_expr(value[1])}) .{behavior}"
    if tag == 7 and len(value) == 3 and isinstance(value[1], int) and value[1] >= 0:
        return f"Std.Format.tag {value[1]} ({format_expr(value[2])})"
    raise ValueError(f"invalid compact Std.Format node: {value!r}")


def annotation_table_expr(value: Any) -> str:
    if not isinstance(value, dict):
        raise ValueError("format annotations must be an object")
    indexed: dict[int, str] = {}
    for raw_tag, raw_annotation in value.items():
        try:
            tag = int(raw_tag)
        except (TypeError, ValueError) as error:
            raise ValueError(f"invalid annotation tag: {raw_tag!r}") from error
        if tag < 0 or str(tag) != str(raw_tag):
            raise ValueError(f"invalid annotation tag: {raw_tag!r}")
        if not isinstance(raw_annotation, dict):
            raise ValueError(f"annotation {tag} must be an object")
        css_class = raw_annotation.get("cssClass")
        binding = raw_annotation.get("binding")
        if not isinstance(css_class, str):
            raise ValueError(f"annotation {tag} must provide a string cssClass")
        if binding is not None and not isinstance(binding, str):
            raise ValueError(f"annotation {tag} binding must be a string")
        binding_expr = "none" if binding is None else f"some {lean_string(binding)}"
        indexed[tag] = (
            f"{{ tag := {tag}, annotation := {{ cssClass := {lean_string(css_class)}, "
            f"binding := {binding_expr} }} }}"
        )
    if not indexed:
        return "#[]"
    return "#[" + ", ".join(indexed[tag] for tag in sorted(indexed)) + "]"


class Registry:
    def __init__(self) -> None:
        self.formats: list[Any] = []
        self.annotations: list[dict[str, Any]] = []
        self.ids: dict[str, int] = {}
        self.contents: list[Any] = []
        self.content_ids: dict[str, int] = {}

    def attach(self, data: dict[str, Any]) -> None:
        if "fmt" not in data:
            raise ValueError("format data is missing its fmt field")
        annotations = data.get("annotations", {})
        if not isinstance(annotations, dict):
            raise ValueError("format data annotations must be an object")
        key = json.dumps(
            [data["fmt"], annotations],
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        format_id = self.ids.get(key)
        if format_id is None:
            format_id = len(self.formats)
            self.ids[key] = format_id
            self.formats.append(data["fmt"])
            self.annotations.append(annotations)
        data["formatId"] = format_id

    def patch_payload(self, data: Any) -> Any:
        if isinstance(data, dict) and "fmt" in data:
            self.attach(data)
            return data
        if not isinstance(data, list):
            raise ValueError("data-rich-format has an unknown payload shape")
        for goal in data:
            for hypothesis in goal.get("hypotheses", []):
                encoded = hypothesis.get("ppType")
                if encoded:
                    nested = json.loads(encoded) if isinstance(encoded, str) else encoded
                    self.attach(nested)
                    hypothesis["ppType"] = compact(nested) if isinstance(encoded, str) else nested
            encoded = goal.get("ppConclusion")
            if encoded:
                nested = json.loads(encoded) if isinstance(encoded, str) else encoded
                self.attach(nested)
                goal["ppConclusion"] = compact(nested) if isinstance(encoded, str) else nested
        return data

    def attach_content(self, data: Any) -> int:
        key = compact(data)
        content_id = self.content_ids.get(key)
        if content_id is None:
            content_id = len(self.contents)
            self.content_ids[key] = content_id
            self.contents.append(data)
        return content_id

    def patch_html(self, body: str) -> str:
        def replace(match: re.Match[str]) -> str:
            payload = json.loads(html.unescape(match.group(1)))
            patched = self.patch_payload(payload)
            content_id = self.attach_content(patched)
            encoded = compact(patched)
            return (
                f'data-rich-format="{html.escape(encoded, quote=True)}" '
                f'data-vir-panel-content="{content_id}"'
            )

        return RICH_FORMAT.sub(replace, body)

    def lean_module(self, pretty_source: Path | None = None) -> str:
        values = ",\n    ".join(format_expr(value) for value in self.formats)
        annotation_values = ",\n    ".join(
            annotation_table_expr(value) for value in self.annotations
        )
        if pretty_source is None:
            prelude = "import VersoSlides.Pretty"
        else:
            prelude = pretty_source.read_text().rstrip()
        return f"""/- Generated by scripts/generate-pretty-registry.py. Do not edit. -/
{prelude}

namespace VersoSlides.PrettyRegistry

open Lean

private initialize formats : Array Std.Format ← pure #[
    {values}
  ]

private initialize annotationTables :
    Array (Array VersoSlides.Pretty.TaggedAnnotation) ← pure #[
    {annotation_values}
  ]

public def formatCountForVir : Nat := formats.size

public def formatRenderedByIdForVir (id width indent : Nat) :
    VersoSlides.Pretty.ResidentRendered :=
  VersoSlides.Pretty.formatRenderedAt formats id width indent

public def formatRenderPlanByIdForVir (id width indent : Nat) :
    VersoSlides.Pretty.ResidentRenderPlan :=
  VersoSlides.Pretty.formatRenderPlanAt formats annotationTables id width indent

end VersoSlides.PrettyRegistry
"""

    def panel_module(self) -> str:
        values = ",\n    ".join(format_expr(value) for value in self.formats)
        annotation_values = ",\n    ".join(
            annotation_table_expr(value) for value in self.annotations
        )
        contents = ",\n    ".join(panel_content_expr(value) for value in self.contents)
        return f"""/- Generated by scripts/generate-pretty-registry.py. Do not edit. -/
import VirPanelExperiment

namespace VirPanelRegistry

open Lean.Vir
open Lean.Vir.Browser (DomM)
open VersoSlides

private initialize formats : Array Std.Format ← pure #[
    {values}
  ]

private initialize annotationTables :
    Array (Array Pretty.TaggedAnnotation) ← pure #[
    {annotation_values}
  ]

private def richText (id : Nat) : Panel.RichText :=
  match formats[id]?, annotationTables[id]? with
  | some format, some annotations => {{ format, annotations }}
  | _, _ => default

private initialize contents : Array Panel.Content ← pure #[
    {contents}
  ]

/-
The formatter matrix and the React panel deliberately share this module, its
resident tables, and one VIR runtime. These wrappers keep the browser-facing
ABI explicit without duplicating the canonical formatter implementation.
-/

@[vir_export]
def formatSegments (format : Std.Format) (width indent : Nat) :
    Array Pretty.Segment :=
  Pretty.formatSegmentsForVir format width indent

@[vir_export]
def formatRendered (format : Std.Format) (width indent : Nat) : Pretty.Rendered :=
  Pretty.formatRenderedForVir format width indent

@[vir_export]
def formatRenderPlan (format : Std.Format)
    (annotations : Array Pretty.TaggedAnnotation) (width indent : Nat) :
    Pretty.RenderPlan :=
  Pretty.formatRenderPlanForVir format annotations width indent

@[vir_export]
def formatHtml (format : Std.Format)
    (annotations : Array Pretty.TaggedAnnotation) (width indent : Nat) : String :=
  Pretty.formatHtmlForVir format annotations width indent

@[vir_export]
def formatCount : Nat := formats.size

@[vir_export]
def formatRenderedById (id width indent : Nat) : Pretty.ResidentRendered :=
  Pretty.formatRenderedAt formats id width indent

@[vir_export]
def formatRenderPlanById (id width indent : Nat) : Pretty.ResidentRenderPlan :=
  Pretty.formatRenderPlanAt formats annotationTables id width indent

@[vir_export]
def mountContent (selector : String) (contentId : Nat)
    (widths : Array Nat) (measureOnly : Bool) : DomM Bool :=
  match contents[contentId]? with
  | none => pure false
  | some content =>
    let width := widths[0]?.getD 40
    Lean.Vir.React.Root.renderComponentIntoSelector selector
      VirPanelExperiment.view {{ content, width := max 1 width, widths, measureOnly }}

@[vir_export]
def unmount (selector : String) : DomM Bool :=
  VirPanelExperiment.unmount selector

end VirPanelRegistry
"""


def option_string_expr(value: Any) -> str:
    if value is None:
        return "none"
    if not isinstance(value, str):
        raise ValueError(f"expected optional string, got {value!r}")
    return f"some {lean_string(value)}"


def rich_text_expr(value: Any) -> str:
    if value is None:
        return "none"
    if isinstance(value, str):
        value = json.loads(value)
    if not isinstance(value, dict):
        raise ValueError(f"format data must be an object, got {value!r}")
    format_id = value.get("formatId")
    if not isinstance(format_id, int) or format_id < 0:
        raise ValueError(f"format data is missing a valid formatId: {value!r}")
    return f"some (richText {format_id})"


def panel_content_expr(value: Any) -> str:
    if isinstance(value, dict):
        rich = rich_text_expr(value)
        if not rich.startswith("some "):
            raise ValueError("signature content must provide format data")
        return f".signature ({rich[5:]})"
    if not isinstance(value, list):
        raise ValueError(f"panel content has an unknown payload shape: {value!r}")

    goals: list[str] = []
    for goal in value:
        if not isinstance(goal, dict):
            raise ValueError(f"goal must be an object: {goal!r}")
        hypotheses: list[str] = []
        for hypothesis in goal.get("hypotheses", []):
            if not isinstance(hypothesis, dict):
                raise ValueError(f"hypothesis must be an object: {hypothesis!r}")
            names = hypothesis.get("names", [])
            if not isinstance(names, list) or not all(isinstance(name, str) for name in names):
                raise ValueError(f"hypothesis names must be strings: {names!r}")
            names_expr = "#[" + ", ".join(lean_string(name) for name in names) + "]"
            hypotheses.append(
                "{ names := "
                + names_expr
                + ", type? := "
                + rich_text_expr(hypothesis.get("ppType"))
                + " }"
            )
        hypotheses_expr = "#[" + ", ".join(hypotheses) + "]"
        goal_prefix = goal.get("goalPrefix", "⊢")
        if not isinstance(goal_prefix, str):
            raise ValueError(f"goalPrefix must be a string: {goal_prefix!r}")
        goals.append(
            "{ name := "
            + option_string_expr(goal.get("name"))
            + ", hypotheses := "
            + hypotheses_expr
            + ", goalPrefix := "
            + lean_string(goal_prefix)
            + ", conclusion? := "
            + rich_text_expr(goal.get("ppConclusion"))
            + " }"
        )
    return ".goals #[" + ", ".join(goals) + "]"


def patch_docs(path: Path, registry: Registry) -> None:
    def visit(value: Any) -> Any:
        if isinstance(value, str):
            return registry.patch_html(value) if "data-rich-format=" in value else value
        if isinstance(value, list):
            return [visit(item) for item in value]
        if isinstance(value, dict):
            return {key: visit(item) for key, item in value.items()}
        return value

    data = json.loads(path.read_text())
    path.write_text(compact(visit(data)) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("site_dir", type=Path)
    parser.add_argument("lean_output", type=Path)
    parser.add_argument("metadata_output", type=Path)
    parser.add_argument(
        "--pretty-source",
        type=Path,
        help="embed a self-contained pretty-printer source before the generated registry",
    )
    parser.add_argument(
        "--panel-output",
        type=Path,
        help="also generate the resident VIR/React panel-content module",
    )
    parser.add_argument(
        "--combined-panel",
        action="store_true",
        help="write the unified formatter/panel VIR module to lean_output",
    )
    args = parser.parse_args()

    index = args.site_dir / "index.html"
    if not index.is_file():
        raise SystemExit(f"deck index not found: {index}")

    registry = Registry()
    index.write_text(registry.patch_html(index.read_text()))
    for docs in sorted(args.site_dir.glob("*verso-docs.json")):
        patch_docs(docs, registry)

    if args.combined_panel and args.panel_output is not None:
        raise SystemExit("--combined-panel and --panel-output are mutually exclusive")

    args.lean_output.parent.mkdir(parents=True, exist_ok=True)
    args.lean_output.write_text(
        registry.panel_module()
        if args.combined_panel
        else registry.lean_module(args.pretty_source)
    )
    if args.panel_output is not None:
        args.panel_output.parent.mkdir(parents=True, exist_ok=True)
        args.panel_output.write_text(registry.panel_module())
    metadata = {
        "schemaVersion": 2,
        "formatCount": len(registry.formats),
        "idField": "formatId",
        "entrypoint": (
            "VirPanelRegistry.formatRenderedById"
            if args.combined_panel
            else "VersoSlides.PrettyRegistry.formatRenderedByIdForVir"
        ),
        "output": "text-events-utf8/v1",
        "renderPlanEntrypoint": (
            "VirPanelRegistry.formatRenderPlanById"
            if args.combined_panel
            else "VersoSlides.PrettyRegistry.formatRenderPlanByIdForVir"
        ),
        "renderPlanOutput": "semantic-render-plan/v1",
    }
    if args.combined_panel or args.panel_output is not None:
        metadata.update(
            {
                "panelContentCount": len(registry.contents),
                "panelEntrypoint": "VirPanelRegistry.mountContent",
            }
        )
    args.metadata_output.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_output.write_text(
        json.dumps(metadata, indent=2)
        + "\n"
    )
    print(
        f"generated resident pretty registry with {len(registry.formats)} unique formats "
        f"and {len(registry.contents)} panel contents"
    )


if __name__ == "__main__":
    main()
