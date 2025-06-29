// Estado global de la aplicación
let appState = {
    apiKey: '',
    model: 'gemini-2.5-flash-preview-0520',
    content: '',
    files: [], // Array para múltiples archivos
    quizType: '',
    questions: [],
    currentQuestion: 0,
    answers: [],
    startTime: null,
    endTime: null,
    isQuizActive: false
};

// Variables para música (removidas)

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupFileUpload();
    setupThemeToggle(); // Agregar configuración del tema
    loadSavedData();
}

function setupEventListeners() {
    // Navegación entre pasos
    document.getElementById('nextStep1').addEventListener('click', validateStep1);
    document.getElementById('nextStep2').addEventListener('click', validateStep2);
    document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
    
    // Controles del quiz
    document.getElementById('prevQuestion').addEventListener('click', previousQuestion);
    document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
    document.getElementById('finishQuiz').addEventListener('click', finishQuiz);
    
    // Acciones de resultados
    document.getElementById('retakeQuiz').addEventListener('click', retakeQuiz);
    document.getElementById('newQuiz').addEventListener('click', newQuiz);
    
    // Tabs de contenido
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });
    
    // Tipos de quiz
    document.querySelectorAll('.quiz-type').forEach(type => {
        type.addEventListener('click', selectQuizType);
    });
    
    // Modelos
    document.getElementById('refreshModels').addEventListener('click', refreshAvailableModels);
}

function setupFileUpload() {
    const fileInput = document.getElementById('pdfFile');
    const fileUpload = document.querySelector('.file-upload');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    fileUpload.addEventListener('dragover', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--primary-color)';
        fileUpload.style.background = 'rgba(102, 126, 234, 0.05)';
    });
    
    fileUpload.addEventListener('dragleave', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--border-color)';
        fileUpload.style.background = '';
    });
    
    fileUpload.addEventListener('drop', function(e) {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--border-color)';
        fileUpload.style.background = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            fileInput.files = files;
            handleFileSelect();
        }
    });
}

function loadSavedData() {
    // Cargar datos guardados del localStorage
    const savedApiKey = localStorage.getItem('ai-quiz-api-key');
    const savedModel = localStorage.getItem('ai-quiz-model');
    
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
    }
    
    if (savedModel) {
        document.getElementById('modelSelect').value = savedModel;
    }
}

// Validación del paso 1
function validateStep1() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    
    if (!apiKey) {
        showError('Por favor, ingresa tu API key de Google AI Studio');
        return;
    }
    
    // Guardar configuración
    appState.apiKey = apiKey;
    appState.model = model;
    
    // Guardar en localStorage
    localStorage.setItem('ai-quiz-api-key', apiKey);
    localStorage.setItem('ai-quiz-model', model);
    
    // Avanzar al siguiente paso
    showStep(2);
}

// Validación del paso 2
function validateStep2() {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'text') {
        const textContent = document.getElementById('textContent').value.trim();
        if (!textContent) {
            showError('Por favor, ingresa el contenido del tema');
            return;
        }
        appState.content = textContent;
        appState.files = []; // Limpiar archivos si usamos texto
    } else if (activeTab === 'pdf') {
        if (appState.files.length === 0) {
            showError('Por favor, selecciona al menos un archivo PDF o imagen');
            return;
        }
        
        // Combinar contenido de archivos de texto
        let combinedText = '';
        appState.files.forEach(file => {
            if (file.fileType === 'pdf' && file.content) {
                combinedText += `\n--- Contenido de ${file.name} ---\n${file.content}\n`;
            }
        });
        
        appState.content = combinedText.trim();
        
        // Las imágenes se procesarán por separado en la generación del quiz
    }
    
    showStep(3);
}

// Manejo de selección de archivos
async function handleFileSelect() {
    const files = Array.from(document.getElementById('pdfFile').files);
    
    // Limitar a 5 archivos
    if (files.length > 5) {
        showError('Máximo 5 archivos permitidos. Se seleccionarán los primeros 5.');
        files.splice(5);
    }
    
    const preview = document.getElementById('pdfPreview');
    const counter = document.getElementById('fileCounter');
    const countSpan = document.getElementById('fileCount');
    
    // Actualizar contador
    countSpan.textContent = files.length;
    updateFileCounter(files.length);
    
    if (files.length === 0) {
        preview.classList.remove('show');
        appState.files = [];
        return;
    }
    
    preview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Procesando archivos...</p>';
    preview.classList.add('show');
    
    try {
        const processedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileData = {
                name: file.name,
                size: file.size,
                type: file.type,
                content: null
            };
            
            if (file.type === 'application/pdf') {
                fileData.content = await extractTextFromPDF(file);
                fileData.fileType = 'pdf';
            } else if (file.type.startsWith('image/')) {
                fileData.content = await convertImageToBase64(file);
                fileData.fileType = 'image';
            }
            
            processedFiles.push(fileData);
        }
        
        appState.files = processedFiles;
        displayFilePreview(processedFiles);
        
    } catch (error) {
        preview.innerHTML = `<p style="color: var(--error-color);"><i class="fas fa-exclamation-triangle"></i> Error al procesar archivos: ${error.message}</p>`;
    }
}

function updateFileCounter(count) {
    const counter = document.getElementById('fileCounter');
    counter.classList.remove('warning', 'error');
    
    if (count >= 4) {
        counter.classList.add('warning');
    }
    if (count >= 5) {
        counter.classList.add('error');
    }
}

function displayFilePreview(files) {
    const preview = document.getElementById('pdfPreview');
    
    let html = '<div class="files-list">';
    
    files.forEach((file, index) => {
        const iconClass = file.fileType === 'pdf' ? 'fas fa-file-pdf pdf' : 'fas fa-image image';
        const sizeText = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        
        html += `
            <div class="file-item" data-index="${index}">
                <div class="file-info">
                    <div class="file-icon ${file.fileType}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${sizeText}</div>
                    </div>
                </div>
                <button class="file-remove" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                    Eliminar
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    preview.innerHTML = html;
}

// Función global para remover archivos (llamada desde el HTML)
window.removeFile = removeFile;

// Función global para remover archivos
function removeFile(index) {
    appState.files.splice(index, 1);
    
    // Actualizar el input file
    const fileInput = document.getElementById('pdfFile');
    const dt = new DataTransfer();
    
    appState.files.forEach(fileData => {
        // Note: No podemos recrear el File object original, así que limpiamos el input
    });
    
    fileInput.value = '';
    
    // Actualizar UI
    const countSpan = document.getElementById('fileCount');
    countSpan.textContent = appState.files.length;
    updateFileCounter(appState.files.length);
    
    if (appState.files.length === 0) {
        document.getElementById('pdfPreview').classList.remove('show');
    } else {
        displayFilePreview(appState.files);
    }
}

// Convertir imagen a base64
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al leer la imagen'));
        reader.readAsDataURL(file);
    });
}

// Extracción de texto de PDF
async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                resolve(fullText.trim());
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsArrayBuffer(file);
    });
}

// Cambio de tabs
function switchTab(e) {
    const tabName = e.target.dataset.tab;
    
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Mostrar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Selección de tipo de quiz
function selectQuizType(e) {
    const type = e.currentTarget.dataset.type;
    
    // Actualizar selección visual
    document.querySelectorAll('.quiz-type').forEach(qt => {
        qt.classList.remove('selected');
    });
    e.currentTarget.classList.add('selected');
    
    appState.quizType = type;
}

// Obtener modelos disponibles de Google AI Studio
async function refreshAvailableModels() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        updateModelStatus('Primero ingresa tu API key para obtener los modelos disponibles', 'error');
        return;
    }
    
    const refreshBtn = document.getElementById('refreshModels');
    const modelSelect = document.getElementById('modelSelect');
    const currentValue = modelSelect.value;
    
    // UI loading state
    refreshBtn.disabled = true;
    refreshBtn.classList.add('loading');
    updateModelStatus('Obteniendo modelos disponibles...', '');
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error de API: ${response.status}`);
        }
        
        const data = await response.json();
        const models = data.models || [];
        
        // Filtrar solo modelos Gemini que soportan generateContent y excluir pro/tts
        const geminiModels = models.filter(model => {
            const modelName = model.name.replace('models/', '');
            return modelName.startsWith('gemini') && 
                   model.supportedGenerationMethods && 
                   model.supportedGenerationMethods.includes('generateContent') &&
                   !modelName.includes('pro') &&
                   !modelName.includes('tts') &&
                   !modelName.includes('text-to-speech');
        });
        
        if (geminiModels.length === 0) {
            throw new Error('No se encontraron modelos Gemini compatibles');
        }
        
        // Actualizar select con modelos obtenidos
        updateModelSelect(geminiModels, currentValue);
        updateModelStatus(`✓ Se encontraron ${geminiModels.length} modelos disponibles`, 'success');
        
    } catch (error) {
        console.error('Error fetching models:', error);
        updateModelStatus(`Error: ${error.message}`, 'error');
        
        // Mantener modelos por defecto en caso de error
        resetDefaultModels(currentValue);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('loading');
    }
}

function updateModelSelect(models, currentValue) {
    const modelSelect = document.getElementById('modelSelect');
    
    // Limpiar opciones actuales
    modelSelect.innerHTML = '';
    
    // Ordenar modelos: Flash Preview primero, luego otros
    const sortedModels = models.sort((a, b) => {
        const aName = a.name.replace('models/', '');
        const bName = b.name.replace('models/', '');
        
        // Priorizar modelos Flash Preview
        const aIsFlashPreview = aName.includes('flash-preview') || aName.includes('2.5-flash');
        const bIsFlashPreview = bName.includes('flash-preview') || bName.includes('2.5-flash');
        
        if (aIsFlashPreview && !bIsFlashPreview) return -1;
        if (!aIsFlashPreview && bIsFlashPreview) return 1;
        
        // Dentro de Flash Preview, ordenar por versión (más reciente primero)
        if (aIsFlashPreview && bIsFlashPreview) {
            return bName.localeCompare(aName);
        }
        
        // Para otros modelos, ordenar alfabéticamente
        return aName.localeCompare(bName);
    });
    
    // Agregar modelos obtenidos de la API
    sortedModels.forEach(model => {
        const modelName = model.name.replace('models/', '');
        const displayName = formatModelDisplayName(modelName, model);
        
        const option = document.createElement('option');
        option.value = modelName;
        option.textContent = displayName;
        
        modelSelect.appendChild(option);
    });
    
    // Actualizar recomendación dinámicamente
    updateModelRecommendation(sortedModels);
    
    // Intentar mantener la selección anterior
    if (currentValue && Array.from(modelSelect.options).some(opt => opt.value === currentValue)) {
        modelSelect.value = currentValue;
    } else {
        // Si no hay selección válida, seleccionar el modelo recomendado si está disponible
        const recommendedModel = findRecommendedModel(sortedModels);
        if (recommendedModel) {
            modelSelect.value = recommendedModel.name.replace('models/', '');
        } else if (modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
        }
    }
}

function formatModelDisplayName(modelName, modelInfo) {
    // Crear nombres más descriptivos para los modelos
    const nameMap = {
        'gemini-1.5-flash': 'Gemini 1.5 Flash (Rápido y eficiente)',
        'gemini-1.5-flash-8b': 'Gemini 1.5 Flash 8B (Ultra rápido)',
        'gemini-2.0-flash-exp': 'Gemini 2.0 Flash (Experimental)',
        'gemini-2.5-flash-preview-0514': 'Gemini 2.5 Flash Preview 05-14 ⭐ (Recomendado)',
        'gemini-2.5-flash-preview-0520': 'Gemini 2.5 Flash Preview 05-20 ⭐ (Recomendado)',
    };
    
    // Si tenemos un nombre personalizado, usarlo
    if (nameMap[modelName]) {
        return nameMap[modelName];
    }
    
    // Si no, crear uno basado en el nombre
    let displayName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    displayName = displayName.replace(/-/g, ' ');
    
    // Agregar información adicional si está disponible
    if (modelInfo.displayName && modelInfo.displayName !== modelName) {
        displayName = modelInfo.displayName;
    }
    
    return displayName;
}

function resetDefaultModels(currentValue) {
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.innerHTML = `
        <option value="gemini-2.5-flash-preview-0520">Gemini 2.5 Flash Preview 05-20 ⭐ (Recomendado)</option>
        <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
        <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Ultra rápido)</option>
    `;
    
    if (currentValue && Array.from(modelSelect.options).some(opt => opt.value === currentValue)) {
        modelSelect.value = currentValue;
    }
}

// Función para encontrar el modelo Flash Preview más reciente
function findRecommendedModel(models) {
    // Buscar modelos Flash Preview ordenados por fecha
    const flashPreviewModels = models.filter(model => {
        const modelName = model.name.replace('models/', '');
        return modelName.includes('flash-preview') || 
               (modelName.includes('2.5-flash') && modelName.includes('preview'));
    });
    
    if (flashPreviewModels.length > 0) {
        // Retornar el primero (ya están ordenados por fecha, más reciente primero)
        return flashPreviewModels[0];
    }
    
    return null;
}

// Función para actualizar la recomendación dinámicamente
function updateModelRecommendation(models) {
    const recommendationDiv = document.querySelector('.model-recommendation');
    const recommendedModelSpan = document.querySelector('.recommended-model');
    const reasonSpan = document.querySelector('.recommendation-reason');
    
    if (!recommendationDiv || !recommendedModelSpan || !reasonSpan) return;
    
    const recommendedModel = findRecommendedModel(models);
    
    if (recommendedModel) {
        const modelName = recommendedModel.name.replace('models/', '');
        const displayName = modelName.replace('gemini-', '').replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        recommendedModelSpan.textContent = displayName;
        reasonSpan.textContent = 'El modelo Flash Preview más actual, gratis y con mejor rendimiento';
        recommendationDiv.style.display = 'flex';
    } else {
        // Si no hay Flash Preview disponible, recomendar Flash estándar
        const flashModels = models.filter(model => {
            const modelName = model.name.replace('models/', '');
            return modelName.includes('1.5-flash') && !modelName.includes('pro');
        });
        
        if (flashModels.length > 0) {
            recommendedModelSpan.textContent = 'Gemini 1.5 Flash';
            reasonSpan.textContent = 'Modelo rápido y eficiente, ideal para la mayoría de casos de uso';
            recommendationDiv.style.display = 'flex';
        } else {
            recommendationDiv.style.display = 'none';
        }
    }
}

function updateModelStatus(message, type) {
    const statusElement = document.getElementById('modelStatus');
    statusElement.textContent = message;
    statusElement.className = type ? `${type}` : '';
}

// Generación del quiz
async function generateQuiz() {
    if (!appState.quizType) {
        showError('Por favor, selecciona un tipo de quiz');
        return;
    }
    
    const numQuestions = parseInt(document.getElementById('numQuestions').value);
    const difficulty = document.getElementById('difficulty').value;
    
    showLoading(true);
    
    try {
        const questions = await generateQuestionsWithAI(appState.content, appState.quizType, numQuestions, difficulty);
        appState.questions = questions;
        appState.answers = new Array(questions.length).fill(null);
        appState.currentQuestion = 0;
        
        showStep(4);
        startQuiz();
    } catch (error) {
        showError('Error al generar el quiz: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Generación de preguntas con IA
async function generateQuestionsWithAI(content, quizType, numQuestions, difficulty) {
    const prompt = createPrompt(content, quizType, numQuestions, difficulty);
    
    try {
        // Preparar el contenido para la API
        const parts = [{ text: prompt }];
        
        // Agregar imágenes si las hay
        const imageFiles = appState.files.filter(file => file.fileType === 'image');
        imageFiles.forEach(file => {
            parts.push({
                inline_data: {
                    mime_type: file.type,
                    data: file.content.split(',')[1] // Remover el prefijo data:image/...;base64,
                }
            });
        });
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appState.model}:generateContent?key=${appState.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: parts
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error de API: ${response.status}`);
        }
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        return parseGeneratedQuestions(generatedText, quizType);
    } catch (error) {
        throw new Error(`Error al conectar con la API: ${error.message}`);
    }
}

// Creación del prompt para la IA
function createPrompt(content, quizType, numQuestions, difficulty) {
    const difficultyMap = {
        easy: 'fácil',
        medium: 'intermedio',
        hard: 'difícil'
    };
    
    const hasImages = appState.files.some(file => file.fileType === 'image');
    const imageNote = hasImages ? '\n\nNOTA: También tienes acceso a las imágenes adjuntas. Puedes hacer preguntas sobre el contenido visual si es relevante.' : '';
    
    if (quizType === 'multiple-choice') {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de opción múltiple de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Cada pregunta debe tener exactamente 4 opciones (A, B, C, D)
- Solo una opción debe ser correcta
- Las opciones incorrectas deben ser plausibles pero claramente incorrectas
- Incluye una explicación de por qué la respuesta correcta es correcta y por qué las otras son incorrectas
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": {
        "A": "Opción A",
        "B": "Opción B",
        "C": "Opción C",
        "D": "Opción D"
      },
      "correct_answer": "A",
      "explanation": "Explicación detallada de por qué A es correcta y por qué B, C, D son incorrectas"
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    } else if (quizType === 'matching') {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de unir con flechas de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Cada pregunta debe tener elementos para conectar entre dos columnas
- Una columna (izquierda) con conceptos, términos o elementos
- Otra columna (derecha) con definiciones, características o elementos relacionados
- Exactamente 4-5 pares por pregunta para evitar adivinanzas
- Incluye una explicación de las conexiones correctas
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta o instrucción",
      "leftItems": [
        "Concepto 1",
        "Concepto 2", 
        "Concepto 3",
        "Concepto 4"
      ],
      "rightItems": [
        "Definición 1",
        "Definición 2",
        "Definición 3", 
        "Definición 4"
      ],
      "correctMatches": {
        "0": 0,
        "1": 1,
        "2": 2,
        "3": 3
      },
      "explanation": "Explicación de por qué cada conexión es correcta"
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    } else if (quizType === 'sequence') {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de ordenar secuencias de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Cada pregunta debe presentar una secuencia de pasos, eventos o elementos que deben ordenarse
- Proporciona 4-6 elementos desordenados que el usuario debe reordenar
- Los elementos pueden ser: pasos de un proceso, eventos cronológicos, etapas de desarrollo, etc.
- Incluye una explicación del orden correcto
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta o instrucción (ej: 'Ordena los siguientes pasos del proceso...')",
      "items": [
        "Primer paso o elemento",
        "Segundo paso o elemento", 
        "Tercer paso o elemento",
        "Cuarto paso o elemento"
      ],
      "correctOrder": [0, 1, 2, 3],
      "explanation": "Explicación del orden correcto y por qué cada elemento va en esa posición"
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    } else {
        return `
Basándote en el siguiente contenido${hasImages ? ' y las imágenes adjuntas' : ''}, genera ${numQuestions} preguntas de respuesta abierta de nivel ${difficultyMap[difficulty]}:

CONTENIDO:
${content}${imageNote}

INSTRUCCIONES:
- Las preguntas deben requerir respuestas desarrolladas y reflexivas
- Incluye una respuesta modelo para cada pregunta
${hasImages ? '- Puedes incluir preguntas sobre el contenido visual de las imágenes si es relevante' : ''}
- Usa el siguiente formato JSON:

{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "model_answer": "Respuesta modelo detallada",
      "key_points": ["Punto clave 1", "Punto clave 2", "Punto clave 3"]
    }
  ]
}

Responde SOLO con el JSON válido, sin texto adicional.`;
    }
}

// Parseo de preguntas generadas
function parseGeneratedQuestions(generatedText, quizType) {
    try {
        // Limpiar el texto y extraer JSON
        let jsonText = generatedText.trim();
        
        // Buscar el JSON en el texto
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonText);
        
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error('Formato de respuesta inválido');
        }
        
        return parsed.questions;
    } catch (error) {
        throw new Error('Error al procesar las preguntas generadas: ' + error.message);
    }
}

// Iniciar quiz
function startQuiz() {
    appState.isQuizActive = true;
    appState.startTime = new Date();
    displayQuestion();
    startTimer();
}

// Mostrar pregunta actual
function displayQuestion() {
    const question = appState.questions[appState.currentQuestion];
    const questionNum = appState.currentQuestion + 1;
    const totalQuestions = appState.questions.length;
    
    // Actualizar progreso
    document.getElementById('currentQuestion').textContent = questionNum;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('questionNum').textContent = questionNum;
    
    const progressPercent = (questionNum / totalQuestions) * 100;
    document.querySelector('.progress-fill').style.width = progressPercent + '%';
    
    // Mostrar pregunta
    document.getElementById('questionText').textContent = question.question;
    
    // Obtener contenedores
    const optionsContainer = document.getElementById('questionOptions');
    const inputContainer = document.getElementById('questionInput');
    const matchingContainer = document.getElementById('matchingContainer');
    const sequenceContainer = document.getElementById('sequenceContainer');
    
    // Ocultar todos los contenedores primero
    optionsContainer.style.display = 'none';
    inputContainer.style.display = 'none';
    matchingContainer.style.display = 'none';
    sequenceContainer.style.display = 'none';
    
    // Mostrar el contenedor apropiado según el tipo
    switch(appState.quizType) {
        case 'multiple-choice':
            displayMultipleChoice(question, optionsContainer);
            break;
        case 'open-ended':
            displayOpenEnded(inputContainer);
            break;
        case 'matching':
            displayMatching(question, matchingContainer);
            break;
        case 'sequence':
            displaySequence(question, sequenceContainer);
            break;
    }
    
    // Actualizar controles
    document.getElementById('prevQuestion').disabled = appState.currentQuestion === 0;
    
    const isLastQuestion = appState.currentQuestion === appState.questions.length - 1;
    document.getElementById('nextQuestion').style.display = isLastQuestion ? 'none' : 'inline-flex';
    document.getElementById('finishQuiz').style.display = isLastQuestion ? 'inline-flex' : 'none';
}

// Mostrar pregunta de opción múltiple
function displayMultipleChoice(question, container) {
    container.style.display = 'flex';
    container.innerHTML = '';
    
    Object.entries(question.options).forEach(([letter, text]) => {
        const option = document.createElement('div');
        option.className = 'option';
        option.dataset.value = letter;
        
        const isSelected = appState.answers[appState.currentQuestion] === letter;
        if (isSelected) {
            option.classList.add('selected');
        }
        
        option.innerHTML = `
            <div class="option-letter">${letter}</div>
            <div class="option-text">${text}</div>
        `;
        
        option.addEventListener('click', () => selectOption(letter));
        container.appendChild(option);
    });
}

// Mostrar pregunta abierta
function displayOpenEnded(container) {
    container.style.display = 'block';
    
    const textarea = container.querySelector('textarea');
    textarea.value = appState.answers[appState.currentQuestion] || '';
    
    textarea.addEventListener('input', (e) => {
        appState.answers[appState.currentQuestion] = e.target.value;
    });
}

// Mostrar pregunta de matching
function displayMatching(question, container) {
    container.style.display = 'block';
    
    const leftItems = container.querySelector('#leftItems');
    const rightItems = container.querySelector('#rightItems');
    const connectionsArea = container.querySelector('#matchingConnections');
    
    leftItems.innerHTML = '';
    rightItems.innerHTML = '';
    connectionsArea.innerHTML = '';
    
    // Crear elementos de la izquierda (mantener orden original)
    question.leftItems.forEach((item, index) => {
        const element = document.createElement('div');
        element.className = 'matching-item left-item';
        element.setAttribute('data-left-index', index);
        element.textContent = item;
        element.draggable = true;
        
        element.addEventListener('dragstart', handleMatchingDragStart);
        element.addEventListener('dragend', handleMatchingDragEnd);
        
        leftItems.appendChild(element);
    });
    
    // Crear elementos de la derecha (desordenados para mayor dificultad)
    const shuffledRightItems = [...question.rightItems];
    const shuffledIndices = [...Array(shuffledRightItems.length).keys()];
    
    // Algoritmo Fisher-Yates para mezclar las respuestas
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    
    shuffledIndices.forEach(originalIndex => {
        const element = document.createElement('div');
        element.className = 'matching-item right-item';
        element.setAttribute('data-right-index', originalIndex); // Mantener índice original para evaluación
        element.textContent = question.rightItems[originalIndex];
        
        element.addEventListener('dragover', handleMatchingDragOver);
        element.addEventListener('drop', handleMatchingDrop);
        
        rightItems.appendChild(element);
    });
    
    // Restaurar conexiones guardadas
    const savedAnswers = appState.answers[appState.currentQuestion] || {};
    Object.entries(savedAnswers).forEach(([leftIndex, rightIndex]) => {
        createMatchingConnection(parseInt(leftIndex), parseInt(rightIndex));
    });
    
    // Mostrar progreso de conexiones
    updateMatchingProgress(question, savedAnswers);
}

// Actualizar progreso de matching
function updateMatchingProgress(question, connections) {
    const connectionsArea = document.querySelector('#matchingConnections');
    const existingProgress = connectionsArea.querySelector('.matching-progress');
    
    if (existingProgress) {
        existingProgress.remove();
    }
    
    const totalPairs = question.leftItems.length;
    const connectedPairs = Object.keys(connections).length;
    
    const progressDiv = document.createElement('div');
    progressDiv.className = 'matching-progress';
    progressDiv.innerHTML = `
        <div class="progress-info">
            <i class="fas fa-link"></i>
            <span>Conexiones: ${connectedPairs}/${totalPairs}</span>
        </div>
    `;
    
    connectionsArea.appendChild(progressDiv);
}

// Mostrar pregunta de secuencia
function displaySequence(question, container) {
    container.style.display = 'block';
    
    const itemsContainer = container.querySelector('#sequenceItems');
    itemsContainer.innerHTML = '';
    
    // Obtener orden guardado o crear orden aleatorio inicial
    let itemOrder = appState.answers[appState.currentQuestion];
    if (!itemOrder) {
        itemOrder = [...question.items.map((_, index) => index)];
        // Mezclar aleatoriamente para la primera vez
        for (let i = itemOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [itemOrder[i], itemOrder[j]] = [itemOrder[j], itemOrder[i]];
        }
        appState.answers[appState.currentQuestion] = itemOrder;
    }
    
    // Crear elementos en el orden actual
    itemOrder.forEach((originalIndex, currentPosition) => {
        const element = document.createElement('div');
        element.className = 'sequence-item';
        element.dataset.originalIndex = originalIndex;
        element.dataset.currentPosition = currentPosition;
        element.draggable = true;
        
        element.innerHTML = `
            <div class="sequence-number">${currentPosition + 1}</div>
            <div class="sequence-text">${question.items[originalIndex]}</div>
            <div class="sequence-drag-handle">
                <i class="fas fa-grip-vertical"></i>
            </div>
        `;
        
        element.addEventListener('dragstart', handleSequenceDragStart);
        element.addEventListener('dragend', handleSequenceDragEnd);
        element.addEventListener('dragover', handleSequenceDragOver);
        element.addEventListener('drop', handleSequenceDrop);
        
        itemsContainer.appendChild(element);
    });
}

// Seleccionar opción
function selectOption(letter) {
    appState.answers[appState.currentQuestion] = letter;
    
    // Actualizar UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    document.querySelector(`[data-value="${letter}"]`).classList.add('selected');
}

// ============================================
// MATCHING QUIZ DRAG AND DROP FUNCTIONS
// ============================================

let draggedMatchingItem = null;

function handleMatchingDragStart(e) {
    draggedMatchingItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    
    // Resaltar elementos de destino válidos
    document.querySelectorAll('.right-item').forEach(item => {
        item.classList.add('drop-target-highlight');
    });
}

function handleMatchingDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedMatchingItem = null;
    
    // Remover resaltado de elementos de destino
    document.querySelectorAll('.right-item').forEach(item => {
        item.classList.remove('drop-target-highlight', 'drop-target-active');
    });
}

function handleMatchingDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (e.target.classList.contains('right-item')) {
        e.target.classList.add('drop-target-active');
    }
}

function handleMatchingDrop(e) {
    e.preventDefault();
    
    // Remover estados de drop
    document.querySelectorAll('.right-item').forEach(item => {
        item.classList.remove('drop-target-active');
    });
    
    if (!draggedMatchingItem || !e.target.classList.contains('right-item')) {
        return;
    }
    
    const leftIndex = parseInt(draggedMatchingItem.getAttribute('data-left-index'));
    const rightIndex = parseInt(e.target.getAttribute('data-right-index'));
    
    // Guardar la conexión
    if (!appState.answers[appState.currentQuestion]) {
        appState.answers[appState.currentQuestion] = {};
    }
    appState.answers[appState.currentQuestion][leftIndex] = rightIndex;
    
    // Crear conexión visual
    createMatchingConnection(leftIndex, rightIndex);
    
    // Actualizar progreso
    const question = appState.questions[appState.currentQuestion];
    updateMatchingProgress(question, appState.answers[appState.currentQuestion]);
}

function createMatchingConnection(leftIndex, rightIndex) {
    const leftItem = document.querySelector(`[data-left-index="${leftIndex}"]`);
    const rightItem = document.querySelector(`[data-right-index="${rightIndex}"]`);
    const connectionsArea = document.getElementById('matchingConnections');
    
    if (!leftItem || !rightItem) {
        console.log('Elementos no encontrados:', { leftIndex, rightIndex, leftItem, rightItem });
        return;
    }
    
    // Definir colores para las conexiones
    const connectionColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    const connectionId = `connection-${leftIndex}`;
    
    // Limpiar clases de conexión anteriores
    leftItem.className = leftItem.className.replace(/connected-\d+/g, '');
    rightItem.className = rightItem.className.replace(/connected-\d+/g, '');
    
    // Marcar elementos como conectados con color específico
    leftItem.classList.add('connected', `connected-${leftIndex}`);
    rightItem.classList.add('connected', `connected-${leftIndex}`);
    
    // Agregar número de conexión
    const connectionNumber = leftIndex + 1;
    leftItem.setAttribute('data-connection-number', connectionNumber);
    rightItem.setAttribute('data-connection-number', connectionNumber);
    
    // Eliminar conexión existente si la hay
    const existingConnection = connectionsArea.querySelector(`[data-left="${leftIndex}"]`);
    if (existingConnection) {
        existingConnection.remove();
    }
    
    // Crear línea de conexión con animación (solo en desktop)
    if (window.innerWidth > 768) {
        createConnectionLine(leftIndex, rightIndex, leftItem, rightItem, connectionsArea);
    }
    
    // Agregar efecto de "pop" cuando se conecta
    addConnectionEffect(leftItem, rightItem);
}

// Crear línea de conexión animada
function createConnectionLine(leftIndex, rightIndex, leftItem, rightItem, connectionsArea) {
    const line = document.createElement('div');
    line.className = `connection-line connection-${leftIndex}`;
    line.dataset.left = leftIndex;
    line.dataset.right = rightIndex;
    
    // Calcular posiciones para la línea SVG
    const leftRect = leftItem.getBoundingClientRect();
    const rightRect = rightItem.getBoundingClientRect();
    const containerRect = connectionsArea.getBoundingClientRect();
    
    const startX = leftRect.right - containerRect.left;
    const startY = leftRect.top + (leftRect.height / 2) - containerRect.top;
    const endX = rightRect.left - containerRect.left;
    const endY = rightRect.top + (rightRect.height / 2) - containerRect.top;
    
    // Crear SVG con curva
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - 20;
    
    line.innerHTML = `
        <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
            <path class="line-path" d="M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}" />
            <circle cx="${startX}" cy="${startY}" r="4" fill="currentColor" opacity="0.8">
                <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="1"/>
            </circle>
            <circle cx="${endX}" cy="${endY}" r="4" fill="currentColor" opacity="0.8">
                <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="1"/>
            </circle>
        </svg>
    `;
    
    connectionsArea.appendChild(line);
    
    // Animar la línea apareciendo
    const path = line.querySelector('.line-path');
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    path.style.animation = `drawLine 0.8s ease-out forwards`;
}

// Agregar efecto visual cuando se conecta
function addConnectionEffect(leftItem, rightItem) {
    // Efecto de "pop" en ambos elementos
    [leftItem, rightItem].forEach(item => {
        item.style.transform = 'scale(1.1)';
        item.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        
        setTimeout(() => {
            item.style.transform = 'scale(1)';
        }, 300);
        
        // Resetear transition después de la animación
        setTimeout(() => {
            item.style.transition = 'all 0.3s ease';
        }, 600);
    });
    
    // Crear efecto de partículas
    createConnectionParticles(leftItem, rightItem);
}

// Crear partículas de conexión
function createConnectionParticles(leftItem, rightItem) {
    const leftRect = leftItem.getBoundingClientRect();
    const rightRect = rightItem.getBoundingClientRect();
    
    for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        particle.className = 'connection-particle';
        particle.style.position = 'fixed';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.background = getComputedStyle(leftItem).borderColor;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        particle.style.left = (leftRect.right - 3) + 'px';
        particle.style.top = (leftRect.top + leftRect.height / 2 - 3) + 'px';
        
        document.body.appendChild(particle);
        
        // Animar hacia el elemento derecho
        const deltaX = rightRect.left - leftRect.right;
        const deltaY = (rightRect.top + rightRect.height / 2) - (leftRect.top + leftRect.height / 2);
        
        particle.style.transition = `all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        particle.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0)`;
        particle.style.opacity = '0';
        
        // Remover partícula después de la animación
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 800);
    }
}

// ============================================
// SEQUENCE QUIZ DRAG AND DROP FUNCTIONS  
// ============================================

let draggedSequenceItem = null;

function handleSequenceDragStart(e) {
    draggedSequenceItem = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleSequenceDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedSequenceItem = null;
}

function handleSequenceDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleSequenceDrop(e) {
    e.preventDefault();
    
    if (!draggedSequenceItem || !e.target.closest('.sequence-item')) {
        return;
    }
    
    const targetItem = e.target.closest('.sequence-item');
    if (targetItem === draggedSequenceItem) {
        return;
    }
    
    const container = document.getElementById('sequenceItems');
    const allItems = Array.from(container.children);
    
    const draggedIndex = allItems.indexOf(draggedSequenceItem);
    const targetIndex = allItems.indexOf(targetItem);
    
    // Reordenar elementos en el DOM
    if (draggedIndex < targetIndex) {
        container.insertBefore(draggedSequenceItem, targetItem.nextSibling);
    } else {
        container.insertBefore(draggedSequenceItem, targetItem);
    }
    
    // Actualizar números y guardar orden
    updateSequenceOrder();
}

function updateSequenceOrder() {
    const container = document.getElementById('sequenceItems');
    const items = Array.from(container.children);
    
    // Actualizar números visuales y datos
    const newOrder = items.map((item, index) => {
        const numberElement = item.querySelector('.sequence-number');
        numberElement.textContent = index + 1;
        item.dataset.currentPosition = index;
        return parseInt(item.dataset.originalIndex);
    });
    
    // Guardar nuevo orden
    appState.answers[appState.currentQuestion] = newOrder;
}

// Navegación entre preguntas
function previousQuestion() {
    if (appState.currentQuestion > 0) {
        appState.currentQuestion--;
        displayQuestion();
    }
}

function nextQuestion() {
    if (appState.currentQuestion < appState.questions.length - 1) {
        appState.currentQuestion++;
        displayQuestion();
    }
}

// Timer del quiz
function startTimer() {
    const timerElement = document.getElementById('timer');
    
    setInterval(() => {
        if (!appState.isQuizActive) return;
        
        const now = new Date();
        const elapsed = now - appState.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Finalizar quiz
async function finishQuiz() {
    appState.isQuizActive = false;
    appState.endTime = new Date();
    
    // Verificar que todas las preguntas estén respondidas según el tipo de quiz
    let unanswered = 0;
    
    for (let i = 0; i < appState.questions.length; i++) {
        const answer = appState.answers[i];
        let isAnswered = false;
        
        switch(appState.quizType) {
            case 'multiple-choice':
                isAnswered = answer && answer.trim() !== '';
                break;
            case 'open-ended':
                isAnswered = answer && answer.trim() !== '';
                break;
            case 'matching':
                // Para matching, verificar que haya al menos una conexión
                isAnswered = answer && typeof answer === 'object' && Object.keys(answer).length > 0;
                break;
            case 'sequence':
                isAnswered = answer && Array.isArray(answer) && answer.length > 0;
                break;
        }
        
        if (!isAnswered) {
            unanswered++;
        }
    }
    
    if (unanswered > 0) {
        const quizTypeText = {
            'multiple-choice': 'opción múltiple',
            'open-ended': 'respuesta abierta', 
            'matching': 'unir con flechas',
            'sequence': 'ordenar secuencias'
        };
        
        const message = `Tienes ${unanswered} pregunta(s) de ${quizTypeText[appState.quizType]} sin responder.\n\n¿Deseas continuar con la evaluación?`;
        const confirm = window.confirm(message);
        if (!confirm) {
            appState.isQuizActive = true;
            return;
        }
    }
    
    showLoading(true);
    
    try {
        const results = await evaluateQuiz();
        displayResults(results);
        showStep(5);
    } catch (error) {
        showError('Error al evaluar el quiz: ' + error.message);
        appState.isQuizActive = true;
    } finally {
        showLoading(false);
    }
}

// Evaluación del quiz
async function evaluateQuiz() {
    const results = {
        score: 0,
        correct: 0,
        incorrect: 0,
        details: []
    };
    
    if (appState.quizType === 'multiple-choice') {
        // Evaluación automática para opción múltiple
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i];
            const isCorrect = userAnswer === question.correct_answer;
            
            if (isCorrect) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                correctAnswer: question.correct_answer,
                isCorrect: isCorrect,
                explanation: question.explanation,
                options: question.options
            });
        }
    } else if (appState.quizType === 'matching') {
        // Evaluación automática para matching
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i] || {};
            const correctMatches = question.correctMatches;
            
            let correctCount = 0;
            let totalMatches = Object.keys(correctMatches).length;
            
            // Verificar cada match
            Object.entries(correctMatches).forEach(([leftIndex, rightIndex]) => {
                if (userAnswer[leftIndex] && parseInt(userAnswer[leftIndex]) === parseInt(rightIndex)) {
                    correctCount++;
                }
            });
            
            const isCorrect = correctCount === totalMatches;
            const partialScore = totalMatches > 0 ? correctCount / totalMatches : 0;
            
            if (isCorrect) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                correctMatches: correctMatches,
                isCorrect: isCorrect,
                partialScore: partialScore,
                leftItems: question.leftItems,
                rightItems: question.rightItems
            });
        }
    } else if (appState.quizType === 'sequence') {
        // Evaluación automática para secuencias
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i] || [];
            const correctOrder = question.correctOrder;
            
            // Verificar si el orden es completamente correcto
            const isCorrect = userAnswer.length === correctOrder.length && 
                            userAnswer.every((item, index) => item === correctOrder[index]);
            
            if (isCorrect) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                correctOrder: correctOrder,
                isCorrect: isCorrect,
                items: question.items
            });
        }
    } else {
        // Evaluación con IA para respuestas abiertas
        for (let i = 0; i < appState.questions.length; i++) {
            const question = appState.questions[i];
            const userAnswer = appState.answers[i] || '';
            
            const evaluation = await evaluateOpenAnswer(question, userAnswer);
            
            if (evaluation.score >= 0.7) {
                results.correct++;
            } else {
                results.incorrect++;
            }
            
            results.details.push({
                question: question.question,
                userAnswer: userAnswer,
                modelAnswer: question.model_answer,
                score: evaluation.score,
                feedback: evaluation.feedback,
                keyPoints: question.key_points
            });
        }
    }
    
    results.score = Math.round((results.correct / appState.questions.length) * 100);
    
    return results;
}

// Evaluación de respuestas abiertas con IA
async function evaluateOpenAnswer(question, userAnswer) {
    const prompt = `
Evalúa la siguiente respuesta del estudiante:

PREGUNTA: ${question.question}

RESPUESTA DEL ESTUDIANTE: ${userAnswer}

RESPUESTA MODELO: ${question.model_answer}

PUNTOS CLAVE: ${question.key_points.join(', ')}

INSTRUCCIONES:
- Evalúa la respuesta en una escala de 0.0 a 1.0
- Considera la precisión, completitud y comprensión demostrada
- Proporciona feedback constructivo
- Usa el siguiente formato JSON:

{
  "score": 0.85,
  "feedback": "Feedback detallado explicando los puntos fuertes y áreas de mejora"
}

Responde SOLO con el JSON válido.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appState.model}:generateContent?key=${appState.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });
        
        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Respuesta inválida de la IA');
    } catch (error) {
        // Fallback en caso de error
        return {
            score: 0.5,
            feedback: 'No se pudo evaluar automáticamente esta respuesta.'
        };
    }
}

// Mostrar resultados
function displayResults(results) {
    document.getElementById('finalScore').textContent = results.score;
    document.getElementById('correctAnswers').textContent = results.correct;
    document.getElementById('incorrectAnswers').textContent = results.incorrect;
    
    const totalTime = appState.endTime - appState.startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = Math.floor((totalTime % 60000) / 1000);
    document.getElementById('totalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Mostrar detalles
    const breakdown = document.getElementById('resultsBreakdown');
    breakdown.innerHTML = '';
    
    results.details.forEach((detail, index) => {
        const item = document.createElement('div');
        item.className = `result-item ${getResultItemClass(detail)}`;
        
        switch(appState.quizType) {
            case 'multiple-choice':
                item.innerHTML = createMultipleChoiceResult(detail, index);
                break;
            case 'matching':
                item.innerHTML = createMatchingResult(detail, index);
                break;
            case 'sequence':
                item.innerHTML = createSequenceResult(detail, index);
                break;
            case 'open-ended':
                item.innerHTML = createOpenEndedResult(detail, index);
                break;
        }
        
        breakdown.appendChild(item);
    });
}

// Funciones auxiliares para mostrar resultados
function getResultItemClass(detail) {
    if (detail.hasOwnProperty('isCorrect')) {
        return detail.isCorrect ? 'correct' : 'incorrect';
    } else if (detail.hasOwnProperty('score')) {
        return detail.score >= 0.7 ? 'correct' : 'incorrect';
    }
    return 'incorrect';
}

function createMultipleChoiceResult(detail, index) {
    return `
        <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
        <div class="result-answer">
            <strong>Tu respuesta:</strong> ${detail.userAnswer ? `${detail.userAnswer}) ${detail.options[detail.userAnswer]}` : 'Sin respuesta'}
        </div>
        <div class="result-answer">
            <strong>Respuesta correcta:</strong> ${detail.correctAnswer}) ${detail.options[detail.correctAnswer]}
        </div>
        <div class="result-explanation">${detail.explanation}</div>
    `;
}

function createMatchingResult(detail, index) {
    let userMatchesHtml = '';
    let correctMatchesHtml = '';
    
    // Mostrar matches del usuario
    if (Object.keys(detail.userAnswer).length > 0) {
        Object.entries(detail.userAnswer).forEach(([leftIndex, rightIndex]) => {
            const leftItem = detail.leftItems[parseInt(leftIndex)];
            const rightItem = detail.rightItems[parseInt(rightIndex)];
            userMatchesHtml += `<div class="match-pair">${leftItem} → ${rightItem}</div>`;
        });
    } else {
        userMatchesHtml = '<div class="no-answer">Sin respuestas</div>';
    }
    
    // Mostear matches correctos
    Object.entries(detail.correctMatches).forEach(([leftIndex, rightIndex]) => {
        const leftItem = detail.leftItems[parseInt(leftIndex)];
        const rightItem = detail.rightItems[parseInt(rightIndex)];
        correctMatchesHtml += `<div class="match-pair">${leftItem} → ${rightItem}</div>`;
    });
    
    return `
        <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
        <div class="result-answer">
            <strong>Tus conexiones:</strong>
            <div class="matches-list">${userMatchesHtml}</div>
        </div>
        <div class="result-answer">
            <strong>Conexiones correctas:</strong>
            <div class="matches-list">${correctMatchesHtml}</div>
        </div>
        <div class="result-score">
            <strong>Puntuación parcial:</strong> ${Math.round(detail.partialScore * 100)}%
        </div>
    `;
}

function createSequenceResult(detail, index) {
    let userSequenceHtml = '';
    let correctSequenceHtml = '';
    
    // Mostrar secuencia del usuario
    if (detail.userAnswer.length > 0) {
        detail.userAnswer.forEach((itemIndex, position) => {
            userSequenceHtml += `<div class="sequence-step">${position + 1}. ${detail.items[itemIndex]}</div>`;
        });
    } else {
        userSequenceHtml = '<div class="no-answer">Sin respuesta</div>';
    }
    
    // Mostrar secuencia correcta
    detail.correctOrder.forEach((itemIndex, position) => {
        correctSequenceHtml += `<div class="sequence-step">${position + 1}. ${detail.items[itemIndex]}</div>`;
    });
    
    return `
        <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
        <div class="result-answer">
            <strong>Tu secuencia:</strong>
            <div class="sequence-list">${userSequenceHtml}</div>
        </div>
        <div class="result-answer">
            <strong>Secuencia correcta:</strong>
            <div class="sequence-list">${correctSequenceHtml}</div>
        </div>
    `;
}

function createOpenEndedResult(detail, index) {
    return `
        <div class="result-question">Pregunta ${index + 1}: ${detail.question}</div>
        <div class="result-answer">
            <strong>Tu respuesta:</strong> ${detail.userAnswer || 'Sin respuesta'}
        </div>
        <div class="result-answer">
            <strong>Puntuación:</strong> ${Math.round(detail.score * 100)}%
        </div>
        <div class="result-explanation">${detail.feedback}</div>
    `;
}

// ========================
// AUTOMATIC BACKGROUND FUNCTIONALITY
// ========================

function applyThemeBackground(theme) {
    // Remover todas las clases de fondo existentes
    const backgroundClasses = [
        'bg-default', 'bg-library', 'bg-study-desk', 
        'bg-forest', 'bg-mountains', 'bg-ocean', 
        'bg-geometric', 'bg-gradient', 'bg-minimal'
    ];
    
    backgroundClasses.forEach(cls => {
        document.body.classList.remove(cls);
    });
    
    // Aplicar fondo según el tema
    if (theme === 'dark') {
        document.body.classList.add('bg-study-desk'); // Escritorio de estudio para modo oscuro
    } else {
        document.body.classList.add('bg-minimal'); // Minimalista para modo claro
    }
}

// Acciones de resultados
function retakeQuiz() {
    appState.answers = new Array(appState.questions.length).fill(null);
    appState.currentQuestion = 0;
    showStep(4);
    startQuiz();
}

function newQuiz() {
    appState = {
        apiKey: appState.apiKey,
        model: appState.model,
        content: '',
        files: [],
        quizType: '',
        questions: [],
        currentQuestion: 0,
        answers: [],
        startTime: null,
        endTime: null,
        isQuizActive: false
    };
    
    // Limpiar formularios
    document.getElementById('textContent').value = '';
    document.getElementById('pdfFile').value = '';
    document.getElementById('pdfPreview').classList.remove('show');
    document.getElementById('fileCount').textContent = '0';
    updateFileCounter(0);
    document.querySelectorAll('.quiz-type').forEach(qt => qt.classList.remove('selected'));
    
    showStep(2);
}

// Utilidades
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');
}

function showError(message) {
    alert(message); // Simplificado - en producción usar un modal personalizado
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// ========================
// THEME TOGGLE FUNCTIONALITY
// ========================

// Función para inicializar el tema
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Aplicar tema guardado
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Aplicar fondo automático según el tema
    applyThemeBackground(savedTheme);
    
    // Actualizar icono
    if (savedTheme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeToggle.title = 'Cambiar a modo claro';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeToggle.title = 'Cambiar a modo oscuro';
    }
}

// Función para alternar tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('i');
    
    // Aplicar nuevo tema
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Aplicar fondo automático según el nuevo tema
    applyThemeBackground(newTheme);
    
    // Guardar en localStorage
    localStorage.setItem('theme', newTheme);
    
    // Actualizar icono con animación
    themeIcon.style.transform = 'rotate(180deg)';
    
    setTimeout(() => {
        if (newTheme === 'dark') {
            themeIcon.className = 'fas fa-sun';
            themeToggle.title = 'Cambiar a modo claro';
        } else {
            themeIcon.className = 'fas fa-moon';
            themeToggle.title = 'Cambiar a modo oscuro';
        }
        themeIcon.style.transform = 'rotate(0deg)';
    }, 150);
}

// Función para configurar el toggle de tema
function setupThemeToggle() {
    // Configurar event listener para el botón de tema
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        initializeTheme();
    }
}