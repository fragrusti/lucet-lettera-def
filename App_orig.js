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
    fetch("/originalText.txt")
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
        console.error("Errore nel caricamento del testo originale:", error);
        setOriginalText(
          "Errore nel caricamento del testo. Controlla che il file originalText.txt sia presente nella cartella public."
        );
        setModifiedText(
          "Errore nel caricamento del testo. Controlla che il file originalText.txt sia presente nella cartella public."
        );
      });
  }, []);

  useEffect(() => {
    const diffs = compareTexts(originalText, modifiedText);
    setDifferences(diffs);
  }, [originalText, modifiedText]);

  useEffect(() => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [modifiedText]);

  const compareTexts = (text1, text2) => {
    const sentences1 = text1.split(/(?<=\.|\?|\!)\s+/);
    const sentences2 = text2.split(/(?<=\.|\?|\!)\s+/);
    const result = [];

    for (let i = 0; i < Math.max(sentences1.length, sentences2.length); i++) {
      if (i >= sentences1.length) {
        result.push({ added: true, value: sentences2[i], id: `added-${i}` });
      } else if (i >= sentences2.length) {
        result.push({
          removed: true,
          value: sentences1[i],
          id: `removed-${i}`,
        });
      } else if (sentences1[i] !== sentences2[i]) {
        result.push({
          changed: true,
          original: sentences1[i],
          modified: sentences2[i],
          id: `changed-${i}`,
        });
      } else {
        result.push({
          unchanged: true,
          value: sentences1[i],
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

  const formatTextWithSuperscript = (text) => {
    return text.replace(/(\d+)\s+/g, (match, number) => {
      return `<sup style="font-size: 0.7em;">${number}</sup> `;
    });
  };

  const renderDifferences = () => {
    return differences.map((diff) => {
      if (diff.unchanged) {
        return (
          <span
            key={diff.id}
            dangerouslySetInnerHTML={{
              __html: formatTextWithSuperscript(diff.value),
            }}
          />
        );
      } else if (diff.changed) {
        return (
          <React.Fragment key={diff.id}>
            <span>{highlightChanges(diff.original, diff.modified)}</span>
            <textarea
              value={motivations[diff.id] || ""}
              onChange={(e) => handleMotivationChange(diff.id, e.target.value)}
              placeholder="Inserisci la motivazione per questa modifica"
              className="block w-full mt-2 p-2 border rounded"
            />
          </React.Fragment>
        );
      } else if (diff.added) {
        return (
          <React.Fragment key={diff.id}>
            <span
              className="bg-green-200"
              dangerouslySetInnerHTML={{
                __html: formatTextWithSuperscript(diff.value),
              }}
            />
            <textarea
              value={motivations[diff.id] || ""}
              onChange={(e) => handleMotivationChange(diff.id, e.target.value)}
              placeholder="Inserisci la motivazione per questa aggiunta"
              className="block w-full mt-2 p-2 border rounded"
            />
          </React.Fragment>
        );
      } else if (diff.removed) {
        return (
          <React.Fragment key={diff.id}>
            <span className="bg-red-200">{diff.value}</span>
            <textarea
              value={motivations[diff.id] || ""}
              onChange={(e) => handleMotivationChange(diff.id, e.target.value)}
              placeholder="Inserisci la motivazione per questa rimozione"
              className="block w-full mt-2 p-2 border rounded"
            />
          </React.Fragment>
        );
      }
    });
  };

  const highlightChanges = (original, modified) => {
    const words1 = original.split(/(\s+)/);
    const words2 = modified.split(/(\s+)/);
    const result = [];

    let i = 0,
      j = 0;
    while (i < words1.length && j < words2.length) {
      if (words1[i] === words2[j]) {
        result.push(<span key={`unchanged-${i}`}>{words1[i]}</span>);
        i++;
        j++;
      } else {
        let removedWords = [];
        let addedWords = [];
        const origIndex = i;
        const modIndex = j;

        while (i < words1.length && words1[i] !== words2[j]) {
          removedWords.push(words1[i]);
          i++;
        }
        while (j < words2.length && words1[origIndex] !== words2[j]) {
          addedWords.push(words2[j]);
          j++;
        }

        if (removedWords.length > 0) {
          result.push(
            <span key={`removed-${origIndex}`} className="bg-red-200">
              {removedWords.join("")}
            </span>
          );
        }
        if (addedWords.length > 0) {
          result.push(
            <span key={`added-${modIndex}`} className="bg-green-200">
              {addedWords.join("")}
            </span>
          );
        }
      }
    }

    while (i < words1.length) {
      result.push(
        <span key={`removed-${i}`} className="bg-red-200">
          {words1[i]}
        </span>
      );
      i++;
    }

    while (j < words2.length) {
      result.push(
        <span key={`added-${j}`} className="bg-green-200">
          {words2[j]}
        </span>
      );
      j++;
    }

    return result;
  };

  const generateFileName = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `PROVA_LETTERA_${year}${month}${day}${hours}${minutes}${seconds}.pdf`;
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

    pdf.save(generateFileName());
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-bold mb-2">Testo Originale</h2>
          <pre
            className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: formatTextWithSuperscript(originalText),
            }}
          />
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
    </div>
  );
};

export default TextCorrectionApp;
