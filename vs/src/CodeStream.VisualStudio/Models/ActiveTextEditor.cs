﻿using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Extensions;
using CodeStream.VisualStudio.UI;
using CodeStream.VisualStudio.UI.Adornments;
using Microsoft.VisualStudio.LanguageServer.Protocol;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Serilog;
using System;

namespace CodeStream.VisualStudio.Models {
	public class ActiveTextEditor : ICanHighlightRange, ICanSelectRange {
		private static readonly ILogger Log = LogManager.ForContext<ActiveTextEditor>();

		public ActiveTextEditor(IWpfTextView wpfTextView, string filePath, Uri uri, int? totalLines) {
			WpfTextView = wpfTextView;
			FilePath = filePath;
			Uri = uri;
			TotalLines = totalLines;
		}

		public IWpfTextView WpfTextView { get; }
		public string FilePath { get; }
		public Uri Uri { get; }
		public int? TotalLines { get; }

		/// <summary>
		/// Highlights code using an adornment layer
		/// </summary>
		/// <param name="range"></param>
		/// <param name="highlight"></param>
		/// <returns></returns>
		public bool Highlight(Range range, bool highlight) {
			var adornmentManager = this.GetHighlightAdornmentManager();

			if (adornmentManager == null) return false;

			return adornmentManager.Highlight(range, highlight);
		}

		/// <summary>
		/// Removes all highlight adornments
		/// </summary>
		public void RemoveAllHighlights() {
			var adornmentManager = this.GetHighlightAdornmentManager();

			if (adornmentManager == null) return;

			adornmentManager.RemoveAllHighlights();
		}

		/// <summary>
		/// Will use the Wpf apis to select a range of code (can handle single points as well)
		/// </summary>
		/// <param name="range">the range to be selected</param>
		/// <param name="focus">if True, focus the editor</param>
		/// <returns></returns>
		public bool SelectRange(EditorSelection selection, bool? focus) {
			try {
				if (WpfTextView == null || selection == null) return false;
				var range = new Range() { Start = selection.Start, End = selection.End };
				string log = "";
				var rangeLines = WpfTextView.GetLinesFromRange(range.Start.Line, range.End.Line);
				if (rangeLines != null) {
					WpfTextView.Selection.Clear();
					VirtualSnapshotPoint anchorPoint;
					VirtualSnapshotPoint activePoint;
					var startPoint = rangeLines.Item1.Extent.Start + range.Start.Character;
					if (range.IsPoint()) {
						anchorPoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
						activePoint = new VirtualSnapshotPoint(new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
					}
					else {
						anchorPoint = new VirtualSnapshotPoint(
							new SnapshotPoint(WpfTextView.TextSnapshot, startPoint));
						activePoint = new VirtualSnapshotPoint(
							new SnapshotPoint(WpfTextView.TextSnapshot, rangeLines.Item2.Extent.End + range.End.Character));
					}
					WpfTextView.Selection.Select(anchorPoint, activePoint);
					log += $"Selecting {nameof(FilePath)}={FilePath} From {anchorPoint} to {activePoint}";

					if (selection.Cursor != null) {
						var caretLine = WpfTextView.GetLine(selection.Cursor);
						if (caretLine != null) {
							WpfTextView.Caret.MoveTo(
								new VirtualSnapshotPoint(
									new SnapshotPoint(WpfTextView.TextSnapshot, caretLine.Extent.Start + selection.Cursor.Character)));
							WpfTextView.Caret.EnsureVisible();
							log += $", caret to ActivePoint={activePoint.Position}";
						}
					}
				}

				if (focus == true) {
					WpfTextView.VisualElement.Focus();
				}

				log += $", focus={focus}";
				Log.Verbose(log);

				return true;
			}
			catch (Exception ex) {
				Log.Warning(ex, $"{nameof(SelectRange)} Range={@selection} Focus={focus}");
			}

			return false;
		}
	}
}
