﻿using Microsoft.VisualStudio.LanguageServer.Protocol;
using System;

namespace CodeStream.VisualStudio.Models {
	public class EditorHighlightRangeResponse {
		public bool Success { get; set; }
	}

	public class EditorHighlightRangeRequest {
		public EditorHighlightRangeRequest(Uri uri, Range range, bool highlight) {
			Uri = uri.ToString();
			Range = range;
			Highlight = highlight;
		}

		public string Uri { get; }
		/// <summary>
		/// A single-line range with start & end char of 0 indicates a full-line highlight
		/// </summary>
		public Range Range { get; }
		public bool Highlight { get; }		
	}

	public class EditorHighlightRangeRequestType : RequestType<EditorHighlightRangeRequest> {
		public const string MethodName = "host/editor/range/highlight";
		public override string Method => MethodName;
	}

	public class EditorRevealRangeRequest {
		public EditorRevealRangeRequest(Uri uri, Range range, bool? preserveFocus, bool? atTop) {
			Uri = uri.ToString();
			Range = range;
			PreserveFocus = preserveFocus;
			AtTop = atTop;
		}

		public string Uri { get; }
		public Range Range { get; }
		/// <summary>
		/// True, if the focus of the webview should remain
		/// </summary>
		public bool? PreserveFocus { get; }
		public bool? AtTop { get; }
	}

	public class EditorRevealRangeResponse {
		public bool Success { get; set; }
	}

	public class EditorRevealRangeRequestType : RequestType<EditorRevealRangeRequest> {
		public const string MethodName = "host/editor/range/reveal";
		public override string Method => MethodName;
	}

	public class EditorSelectRangeResponse {
		public bool Success { get; set; }
	}

	public class EditorSelectRangeRequest {
		public EditorSelectRangeRequest(Uri uri, EditorSelection selection, bool? preserveFocus) {
			Uri = uri.ToString();
			Selection = selection;
			PreserveFocus = preserveFocus;
		}

		public string Uri { get; }
		/// <summary>
		/// A single-line range with start & end char of 0 indicates a full-line highlight
		/// </summary>
		public EditorSelection Selection { get; }
		/// <summary>
		/// True, if the focus of the webview should remain
		/// </summary>
		public bool? PreserveFocus { get; }
	}

	public class EditorSelectRangeRequestType : RequestType<EditorSelectRangeRequest> {
		public const string MethodName = "host/editor/range/select";
		public override string Method => MethodName;
	}
}
