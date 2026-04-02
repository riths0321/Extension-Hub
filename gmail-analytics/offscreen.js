chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "PARSE_XML") {
    return;
  }

  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(message.xmlString, "text/xml");
    const fullCount = Number.parseInt(
      xml.querySelector("fullcount")?.textContent || "0",
      10
    );

    const entries = Array.from(xml.querySelectorAll("entry")).map((entry) => ({
      id: entry.querySelector("id")?.textContent || "",
      title: entry.querySelector("title")?.textContent || "",
      summary: entry.querySelector("summary")?.textContent || "",
      issued: entry.querySelector("issued")?.textContent || "",
      link: entry.querySelector("link")?.getAttribute("href") || "",
      authorName: entry.querySelector("author > name")?.textContent || ""
    }));

    sendResponse({
      type: "PARSE_RESULT",
      count: Number.isNaN(fullCount) ? 0 : fullCount,
      entries
    });
  } catch (error) {
    sendResponse({
      type: "PARSE_RESULT",
      count: 0,
      entries: [],
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return true;
});
