import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "../src/styles.css";

const TextCorrectionApp = () => {
  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");
  const [differences, setDifferences] = useState([]);
  const [motivations, setMotivations] = useState({});
  const textareaRef = useRef(null);

  useEffect(() => {
    // Ottieni il parametro dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    const textParam = urlParams.get("text");

    // Determina quale file caricare
    const fileToLoad =
      textParam === "2" ? "originalText2.txt" : "originalText1.txt";

    fetch(`/${fileToLoad}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Errore nel caricamento del file");
        }
        return response.text();
      })
      .then((data) => {
        setOriginalText(data);
        setModifiedText(data);
      })
      .catch((error) => {
        console.error(
          `Errore nel caricamento del testo originale (${fileToLoad}):`,
          error
        );
        setOriginalText(
          `Errore nel caricamento del testo. Controlla che il file ${fileToLoad} sia presente nella cartella public.`
        );
        setModifiedText(
          `Errore nel caricamento del testo. Controlla che il file ${fileToLoad} sia presente nella cartella public.`
        );
      });
  }, []);

  useEffect(() => {
    const diffs = compareTexts(originalText, modifiedText);
    setDifferences(diffs);
  }, [originalText, modifiedText]);

  const findDifferences = (text1, text2) => {
    const getTokens = (text) => {
      return text.match(/[^\s]+|\s+/g) || [];
    };

    const tokens1 = getTokens(text1);
    const tokens2 = getTokens(text2);

    let i = 0;
    let j = 0;
    const changes = [];
    let currentChange = null;

    while (i < tokens1.length || j < tokens2.length) {
      if (
        i < tokens1.length &&
        j < tokens2.length &&
        tokens1[i] === tokens2[j]
      ) {
        if (currentChange) {
          changes.push(currentChange);
          currentChange = null;
        }
        changes.push({ type: "unchanged", value: tokens1[i] });
        i++;
        j++;
      } else {
        if (!currentChange) {
          currentChange = { type: "changed", removed: [], added: [] };
        }

        if (i < tokens1.length && (!tokens2[j] || tokens1[i] !== tokens2[j])) {
          currentChange.removed.push(tokens1[i]);
          i++;
        }

        if (j < tokens2.length && (!tokens1[i] || tokens1[i] !== tokens2[j])) {
          currentChange.added.push(tokens2[j]);
          j++;
        }
      }
    }

    if (currentChange) {
      changes.push(currentChange);
    }

    return changes;
  };

  const compareTexts = (text1, text2) => {
    const sentences1 = text1.split(/(?<=[.!?])\s+/);
    const sentences2 = text2.split(/(?<=[.!?])\s+/);
    const result = [];

    for (let i = 0; i < Math.max(sentences1.length, sentences2.length); i++) {
      const original = sentences1[i] || "";
      const modified = sentences2[i] || "";

      if (original !== modified) {
        result.push({
          changed: true,
          original,
          modified,
          id: `changed-${i}`,
          changes: findDifferences(original, modified),
        });
      } else {
        result.push({
          unchanged: true,
          value: original,
          id: `unchanged-${i}`,
        });
      }
    }

    return result;
  };

  const handleModifiedTextChange = (e) => {
    const newText = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setModifiedText(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  const handleMotivationChange = (id, motivation) => {
    setMotivations((prev) => ({ ...prev, [id]: motivation }));
  };

  const renderChange = (change) => {
    if (change.type === "unchanged") {
      return change.value;
    }
    if (change.type === "changed") {
      return (
        <>
          {change.removed.length > 0 && (
            <span className="bg-red-200">{change.removed.join("")}</span>
          )}
          {change.added.length > 0 && (
            <span className="bg-green-200">{change.added.join("")}</span>
          )}
        </>
      );
    }
    return null;
  };

  const renderDifferences = () => {
    return differences.map((diff) => {
      if (diff.unchanged) {
        return (
          <div key={diff.id} className="mb-4">
            <span>{diff.value}</span>
          </div>
        );
      } else if (diff.changed) {
        return (
          <div key={diff.id} className="mb-4">
            <div className="mb-2">
              {/* Testo originale con parti rimosse evidenziate */}
              {diff.changes.map((change, index) => (
                <span key={`orig-${index}`}>
                  {change.type === "unchanged" ? (
                    change.value
                  ) : change.type === "changed" && change.removed.length > 0 ? (
                    <span className="bg-red-200">
                      {change.removed.join("")}
                    </span>
                  ) : null}
                </span>
              ))}
              <span className="mx-2">→</span>
              {/* Testo modificato con parti aggiunte evidenziate */}
              {diff.changes.map((change, index) => (
                <span key={`mod-${index}`}>
                  {change.type === "unchanged" ? (
                    change.value
                  ) : change.type === "changed" && change.added.length > 0 ? (
                    <span className="bg-green-200">
                      {change.added.join("")}
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            <textarea
              value={motivations[diff.id] || ""}
              onChange={(e) => handleMotivationChange(diff.id, e.target.value)}
              placeholder="Inserisci la motivazione per questa modifica"
              className="block w-full mt-2 p-2 border rounded"
            />
          </div>
        );
      }
      return null;
    });
  };

  const generateFileName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `PROVA_LETTERA_${year}${month}${day}${hours}${minutes}${seconds}`;
  };

  const generatePDF = () => {
    const pdf = new jsPDF();
    const fontSize = 10; // Dimensione del font ridotta a 10pt
    pdf.setFontSize(fontSize);

    const lineHeight = fontSize * 0.5;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const maxLineWidth = pageWidth - 2 * margin;

    const addWrappedText = (text, y) => {
      const splitText = pdf.splitTextToSize(text, maxLineWidth);
      pdf.text(splitText, margin, y);
      return y + splitText.length * lineHeight;
    };

    let yOffset = 20; // Inizia un po' più in basso per il titolo

    // Testo Originale
    pdf.setFontSize(14);
    pdf.text("Testo Originale", margin, 10);
    pdf.setFontSize(fontSize);
    yOffset = addWrappedText(originalText, yOffset);

    // Testo Modificato con Evidenziazioni
    pdf.addPage();
    yOffset = 20;
    pdf.setFontSize(14);
    pdf.text("Testo Modificato con Evidenziazioni", margin, 10);
    pdf.setFontSize(fontSize);

    differences.forEach((diff) => {
      if (yOffset > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yOffset = 20;
      }

      if (diff.unchanged) {
        yOffset = addWrappedText(diff.value, yOffset);
      } else if (diff.changed || diff.added) {
        pdf.setTextColor(0, 128, 0); // Verde per aggiunte/modifiche
        yOffset = addWrappedText(
          diff.changed ? diff.modified : diff.value,
          yOffset
        );
        pdf.setTextColor(0, 0, 0); // Ripristina il colore nero
      } else if (diff.removed) {
        pdf.setTextColor(255, 0, 0); // Rosso per rimozioni
        yOffset = addWrappedText(diff.value, yOffset);
        pdf.setTextColor(0, 0, 0); // Ripristina il colore nero
      }
      yOffset += lineHeight; // Spazio extra tra le differenze
    });

    // Testo Modificato con Evidenziazioni e Motivazioni
    pdf.addPage();
    yOffset = 20;
    pdf.setFontSize(14);
    pdf.text("Testo Modificato con Evidenziazioni e Motivazioni", margin, 10);
    pdf.setFontSize(fontSize);

    differences.forEach((diff) => {
      if (yOffset > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        yOffset = 20;
      }

      if (diff.unchanged) {
        yOffset = addWrappedText(diff.value, yOffset);
      } else if (diff.changed || diff.added) {
        pdf.setTextColor(0, 128, 0); // Verde per aggiunte/modifiche
        yOffset = addWrappedText(
          diff.changed ? diff.modified : diff.value,
          yOffset
        );
        pdf.setTextColor(0, 0, 0); // Ripristina il colore nero
        yOffset = addWrappedText(
          "Motivazione: " +
            (motivations[diff.id] || "Nessuna motivazione fornita"),
          yOffset + lineHeight
        );
      } else if (diff.removed) {
        pdf.setTextColor(255, 0, 0); // Rosso per rimozioni
        yOffset = addWrappedText(diff.value, yOffset);
        pdf.setTextColor(0, 0, 0); // Ripristina il colore nero
        yOffset = addWrappedText(
          "Motivazione: " +
            (motivations[diff.id] || "Nessuna motivazione fornita"),
          yOffset + lineHeight
        );
      }
      yOffset += lineHeight * 2; // Spazio extra tra le differenze con motivazioni
    });

    pdf.save(generateFileName() + ".pdf");
  };

  const generateTXT = () => {
    let txtContent = "Testo Originale:\n" + originalText + "\n\n";

    txtContent += "Testo Modificato con Marcatori:\n";
    differences.forEach((diff) => {
      if (diff.unchanged) {
        txtContent += diff.value;
      } else if (diff.changed) {
        // Per ogni cambio, dobbiamo processare le modifiche specifiche
        diff.changes.forEach((change) => {
          if (change.type === "unchanged") {
            txtContent += change.value;
          } else if (change.type === "changed") {
            if (change.added.length > 0) {
              txtContent += `<M>${change.added.join("")}</M>`;
            }
          }
        });
      }
    });
    txtContent += "\n\n";

    txtContent += "Motivazioni:\n";
    differences.forEach((diff) => {
      if (diff.changed) {
        txtContent += "\nFrase originale: ";
        diff.changes.forEach((change) => {
          if (change.type === "unchanged") {
            txtContent += change.value;
          } else if (change.type === "changed" && change.removed.length > 0) {
            txtContent += change.removed.join("");
          }
        });

        txtContent += "\nFrase modificata: ";
        diff.changes.forEach((change) => {
          if (change.type === "unchanged") {
            txtContent += change.value;
          } else if (change.type === "changed" && change.added.length > 0) {
            txtContent += change.added.join("");
          }
        });

        txtContent +=
          "\nMotivazione: " +
          (motivations[diff.id] || "Nessuna motivazione fornita") +
          "\n";
      }
    });

    const element = document.createElement("a");
    const file = new Blob([txtContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = generateFileName() + ".txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const addWrappedText = (pdf, text, y) => {
    const splitText = pdf.splitTextToSize(
      text,
      pdf.internal.pageSize.width - 20
    );
    pdf.text(splitText, 10, y);
    return y + splitText.length * 10;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-bold mb-2">Testo Originale</h2>
          <pre className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap">
            {originalText}
          </pre>
        </div>
        <div>
          <h2 className="text-lg font-bold mb-2">Testo Modificato</h2>
          <textarea
            ref={textareaRef}
            value={modifiedText}
            onChange={handleModifiedTextChange}
            className="w-full h-64 p-2 border rounded font-mono"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}
          />
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-bold mb-2">Differenze e Motivazioni</h2>
        <div className="p-2 border rounded">{renderDifferences()}</div>
      </div>
      <button
        onClick={generatePDF}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Genera PDF
      </button>
      <button
        onClick={generateTXT}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2
        px-4 rounded"
      >
        {" "}
        Genera TXT
      </button>
    </div>
  );
};

export default TextCorrectionApp;
