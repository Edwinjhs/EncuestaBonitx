import React, { useState, useEffect } from "react";
import "./App.css";
// Firebase Imports
import { initializeApp } from "firebase/app";
import {
	getAuth,
	signInAnonymously,
	signInWithCustomToken,
	onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";

// Main App component
const App = () => {
	// State to manage current step of the test
	const [step, setStep] = useState(0); // 0: intro, 1-5: questions, 6: email form, 7: results
	// State to store selected answers for each question
	const [answers, setAnswers] = useState({});
	// State to store user's email
	const [email, setEmail] = useState("");
	// State to store the determined result (Modo Exigencia, Transición, Conexión)
	const [resultMode, setResultMode] = useState("");
	// State for validation message
	const [validationMessage, setValidationMessage] = useState("");
	// Firebase states
	const [db, setDb] = useState(null);
	const [auth, setAuth] = useState(null);
	const [userId, setUserId] = useState(null);
	const [authReady, setAuthReady] = useState(false); // To ensure Firebase is ready before operations

	// Firebase Initialization and Authentication
	useEffect(() => {
		try {
			const firebaseConfig = {
				apiKey: "AIzaSyDzeW_gHY2zH25buP5tb4avJY_4R__VOU8",
				authDomain: "holabonitx.firebaseapp.com",
				projectId: "holabonitx",
				storageBucket: "holabonitx.firebasestorage.app",
				messagingSenderId: "438877327229",
				appId: "1:438877327229:web:9403b4f16d8a4628990614",
				measurementId: "G-P5TCKNGMJ3",
			};
			const app = initializeApp(firebaseConfig);
			const firestoreDb = getFirestore(app);
			const firebaseAuth = getAuth(app);

			setDb(firestoreDb);
			setAuth(firebaseAuth);

			// Listen for auth state changes
			const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
				if (user) {
					setUserId(user.uid);
					setAuthReady(true);
				} else {
					// Sign in anonymously if no user is logged in
					try {
						if (
							typeof __initial_auth_token !== "undefined" &&
							__initial_auth_token
						) {
							await signInWithCustomToken(firebaseAuth, __initial_auth_token);
						} else {
							await signInAnonymously(firebaseAuth);
						}
					} catch (error) {
						console.error(
							"Error signing in anonymously or with custom token:",
							error
						);
						setAuthReady(true); // Still set ready even on error to avoid infinite loading
					}
				}
			});

			return () => unsubscribe(); // Cleanup auth listener on unmount
		} catch (error) {
			console.error("Failed to initialize Firebase:", error);
			setAuthReady(true); // Ensure app can proceed even if Firebase init fails
		}
	}, []);

	// Define the test questions
	const questions = [
		{
			id: 1,
			question: "¿Qué es lo primero que piensas al despertar?",
			options: [
				{ text: "A. Tengo tanto que hacer... ya voy tarde.", value: "A" },
				{
					text: "B. Estoy cansada, pero agradezco este nuevo día.",
					value: "B",
				},
				{ text: "C. Hoy es una nueva oportunidad para cuidarme.", value: "C" },
			],
		},
		{
			id: 2,
			question: "¿Cómo te hablas cuando algo no te sale como esperabas?",
			options: [
				{ text: "A. Me critico o me exijo más.", value: "A" },
				{ text: "B. Me frustro, pero trato de entenderme.", value: "B" },
				{ text: "C. Me hablo con amabilidad y me doy espacio.", value: "C" },
			],
		},
		{
			id: 3,
			question: "¿Con qué frecuencia priorizas tus necesidades?",
			options: [
				{ text: "A. Casi nunca, siempre hay algo más importante.", value: "A" },
				{ text: "B. A veces, pero me cuesta sostenerlo.", value: "B" },
				{ text: "C. Con frecuencia, aunque no siempre es fácil.", value: "C" },
			],
		},
		{
			id: 4,
			question: "¿Qué tan conectada te sientes con tus emociones?",
			options: [
				{ text: "A. Las ignoro o las reprimo.", value: "A" },
				{
					text: "B. A veces me abruman, pero trato de expresarlas.",
					value: "B",
				},
				{ text: "C. Las reconozco, las acepto y las valido.", value: "C" },
			],
		},
		{
			id: 5,
			question: "¿Cuál de estas frases describe mejor tu diálogo interno?",
			options: [
				{ text: "A. Nunca es suficiente.", value: "A" },
				{ text: "B. Estoy intentando cambiar.", value: "B" },
				{ text: "C. Me respeto y me acompaño en mi proceso.", value: "C" },
			],
		},
	];

	// Handles user selecting an answer for a question
	const handleAnswer = (questionId, value) => {
		setAnswers({ ...answers, [questionId]: value });
	};

	// Advances to the next question or the next stage of the test
	const goToNext = () => {
		// Validate if an answer has been selected for the current question before moving on
		if (
			step > 0 &&
			step <= questions.length &&
			!answers[questions[step - 1].id]
		) {
			setValidationMessage("Por favor, selecciona una opción para continuar.");
			return;
		}
		setValidationMessage(""); // Clear validation message if successful
		setStep(step + 1); // Increment the step to go to the next question or phase
	};

	// Goes back to the previous question or stage
	const goToPrevious = () => {
		setValidationMessage(""); // Clear validation message when going back
		setStep(step - 1); // Decrement the step
	};

	// Calculates the dominant mode (Exigencia, Transición, Conexión) based on user's answers
	const calculateResults = () => {
		const counts = { A: 0, B: 0, C: 0 }; // Initialize counters for each answer type
		Object.values(answers).forEach((answer) => {
			counts[answer]++; // Increment count for each selected answer
		});

		let maxCount = 0;
		let tiedModes = [];

		// Find the highest count among A, B, and C
		for (const mode in counts) {
			if (counts[mode] > maxCount) {
				maxCount = counts[mode];
			}
		}

		// Identify all modes that have the maximum count (for tie-breaking)
		for (const mode in counts) {
			if (counts[mode] === maxCount) {
				tiedModes.push(mode);
			}
		}

		let dominantMode = "";
		// Determine the dominant mode, prioritizing C (Conexión) > B (Transición) > A (Exigencia) in case of ties
		if (tiedModes.length === 1) {
			dominantMode = tiedModes[0];
		} else {
			// Handle ties: If multiple modes have the same max count, choose the most positive one
			if (tiedModes.includes("C")) {
				dominantMode = "C";
			} else if (tiedModes.includes("B")) {
				dominantMode = "B";
			} else {
				dominantMode = "A"; // Fallback to A if only A is dominant or A is tied with B and C is not present
			}
		}

		// Map the dominant letter (A, B, C) to its corresponding mode name
		let modeDescription = "";
		switch (dominantMode) {
			case "A":
				modeDescription = "Modo Exigencia";
				break;
			case "B":
				modeDescription = "Modo Transición";
				break;
			case "C":
				modeDescription = "Modo Conexión";
				break;
			default:
				modeDescription = "Tu Modo"; // Default if somehow no mode is determined
		}

		setResultMode(modeDescription); // Update state with the calculated result mode
		return modeDescription; // Return the mode description for immediate use
	};

	// Handles the submission of the user's email address and saves data to Firestore
	const handleSubmitEmail = async () => {
		// Basic email format validation
		if (!email || !email.includes("@") || !email.includes(".")) {
			setValidationMessage("Por favor, ingresa un correo electrónico válido.");
			return;
		}
		setValidationMessage(""); // Clear validation message

		if (!authReady || !db) {
			setValidationMessage(
				"La base de datos no está lista. Inténtalo de nuevo en unos segundos."
			);
			return;
		}

		try {
			const calculatedMode = calculateResults(); // Calculate results
			const appId =
				typeof __app_id !== "undefined" ? __app_id : "default-app-id";
			const leadsCollectionRef = collection(
				db,
				`artifacts/${appId}/public/data/test_leads`
			);

			await addDoc(leadsCollectionRef, {
				email: email,
				timestamp: new Date(),
				testAnswers: answers,
				resultMode: calculatedMode,
				userId: userId, // Include userId for tracking, if available
			});

			console.log("Email y resultados guardados en Firestore!");
			setValidationMessage("¡Tu correo ha sido guardado exitosamente!"); // Confirm success
			setStep(questions.length + 2); // Advance to the results display step
		} catch (e) {
			console.error("Error al guardar el correo en Firestore: ", e);
			setValidationMessage(
				"Error al guardar tu correo. Por favor, inténtalo de nuevo."
			);
		}
	};

	// Renders different sections of the test based on the current step
	const renderContent = () => {
		if (!authReady) {
			return (
				<div className="text-center p-6 bg-white rounded-lg shadow-lg">
					<p className="text-gray-700 text-lg">
						Cargando test... por favor espera.
					</p>
				</div>
			);
		}

		switch (step) {
			case 0: // Introduction screen
				return (
					<div className="text-center p-6 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-lg">
						<h2 className="text-3xl font-bold text-pink-700 mb-4 animate-fadeIn">
							¡Hola Bonitx! 👋
						</h2>
						<p className="text-gray-700 mb-6 text-lg">
							Bienvenida a nuestro mini test:{" "}
							<span className="font-semibold">
								"¿Cómo estás contigo misma hoy?"
							</span>
							Este breve test te ayudará a reconectar contigo. Tómate un
							momento, respira profundo y responde con sinceridad. No hay
							respuestas correctas, solo señales que te hablan de ti.
						</p>
						<button
							onClick={() => setStep(1)} // Start the test
							className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105 shadow-md"
						>
							Comenzar Test
						</button>
					</div>
				);
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: // Question display (steps 1 through 5, since questions.length is 5)
				const currentQuestionIndex = step - 1; // Calculate current question index
				const currentQuestion = questions[currentQuestionIndex]; // Get the current question object

				return (
					<div className="p-6 bg-white rounded-lg shadow-lg">
						<h2 className="text-2xl font-bold text-pink-600 mb-6 animate-fadeIn">
							Pregunta {currentQuestionIndex + 1} de {questions.length}
						</h2>
						<p className="text-gray-800 text-xl mb-6">
							{currentQuestion.question}
						</p>
						<div className="space-y-4">
							{currentQuestion.options.map((option) => (
								<button
									key={option.value} // Unique key for React list rendering
									onClick={() => handleAnswer(currentQuestion.id, option.value)} // Handle selection
									className={`w-full text-left p-4 rounded-lg border-2 transition duration-200
                                        ${
																					answers[currentQuestion.id] ===
																					option.value
																						? "bg-pink-200 border-pink-500 text-pink-800 shadow-md" // Style for selected option
																						: "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-pink-300 text-gray-700" // Style for unselected option
																				}
                                        transform hover:scale-[1.01]`}
								>
									{option.text}
								</button>
							))}
						</div>
						{validationMessage && (
							<p className="text-red-500 text-sm mt-4">{validationMessage}</p>
						)}
						<div className="flex justify-between mt-8">
							{step > 1 && ( // Show "Previous" button if not the first question
								<button
									onClick={goToPrevious}
									className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105 shadow-md"
								>
									Anterior
								</button>
							)}
							{step <= questions.length ? ( // Show "Next" button if there are more questions
								<button
									onClick={goToNext}
									className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105 shadow-md ml-auto"
								>
									Siguiente
								</button>
							) : null}
						</div>
					</div>
				);
			case questions.length + 1: // Email collection step (step 6 in this case, after 5 questions)
				return (
					<div className="p-6 bg-white rounded-lg shadow-lg text-center">
						<h2 className="text-2xl font-bold text-pink-600 mb-4 animate-fadeIn">
							¡Casi lista!
						</h2>
						<p className="text-gray-700 mb-6">
							Para ver tus resultados personalizados y un mensaje especial, por
							favor ingresa tu correo electrónico:
						</p>
						<input
							type="email"
							placeholder="tu.correo@ejemplo.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
						/>
						{validationMessage && (
							<p className="text-red-500 text-sm mb-4">{validationMessage}</p>
						)}
						<button
							onClick={handleSubmitEmail} // Submit email and calculate results
							className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105 shadow-md mr-2"
						>
							Ver Mis Resultados
						</button>
						<button
							onClick={goToPrevious} // Go back to the last question
							className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105 shadow-md"
						>
							Volver
						</button>
						<p className="text-sm text-gray-500 mt-4">
							(Tu correo será guardado para futuras novedades de @holabonitx).
						</p>
					</div>
				);
			case questions.length + 2: // Results display step (step 7 in this case)
				return (
					<div className="text-center p-6 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shadow-lg">
						<h2 className="text-3xl font-bold text-pink-700 mb-4 animate-fadeIn">
							¡Gracias por completar el test! ✨
						</h2>
						<p className="text-gray-800 text-xl mb-6">
							Tu resultado es:{" "}
							<span className="font-semibold">{resultMode}</span>
						</p>
						<div className="bg-white p-4 rounded-lg shadow-inner mb-6 text-gray-700">
							{/* Display specific affirmations based on the result mode */}
							{resultMode === "Modo Exigencia" && (
								<>
									<p className="font-semibold text-lg mb-2">
										Mayoría A: Modo Exigencia
									</p>
									<p>
										Estás funcionando desde la exigencia y el deber.
										Probablemente te has desconectado de ti misma para cumplir
										con todo lo que se espera de ti.
									</p>
									<p className="mt-2 font-medium">Afirmación para ti:</p>
									<p className="italic">
										"Hoy me permito bajar la guardia y ser suficiente tal como
										soy."
									</p>
								</>
							)}
							{resultMode === "Modo Transición" && (
								<>
									<p className="font-semibold text-lg mb-2">
										Mayoría B: Modo Transición
									</p>
									<p>
										Estás en un momento de cambio, intentando escucharte más. A
										veces caes en viejos patrones, pero también estás abriéndote
										a una forma nueva de tratarte.
									</p>
									<p className="mt-2 font-medium">Afirmación para ti:</p>
									<p className="italic">
										"Estoy aprendiendo a elegirme cada día, paso a paso."
									</p>
								</>
							)}
							{resultMode === "Modo Conexión" && (
								<>
									<p className="font-semibold text-lg mb-2">
										Mayoría C: Modo Conexión
									</p>
									<p>
										Estás cultivando una relación más amorosa contigo misma.
										Aunque no todo sea perfecto, estás eligiendo desde el
										autocuidado, el respeto y la conciencia.
									</p>
									<p className="mt-2 font-2xl font-medium">
										Afirmación para ti:
									</p>
									<p className="italic">
										"Soy mi lugar seguro. Me honro, me cuido, me celebro."
									</p>
								</>
							)}
						</div>
						<p className="text-gray-700 mb-6 text-lg">
							Si este test resonó contigo, te invito a conocer nuestro
							**Workbook de 7 Días para Practicar el Amor Propio**. ¡Es la guía
							perfecta para profundizar en este viaje!
						</p>
						<p className="text-pink-600 font-bold text-xl mb-4">
							¡Por lanzamiento: Workbook + 4 Bonus exclusivos por solo $7 USD!
						</p>
						<a
							href="TU_ENLACE_DE_VENTA_AQUI" // **IMPORTANTE: Reemplaza esto con tu enlace real de venta del producto**
							target="_blank" // Opens in a new tab
							rel="noopener noreferrer" // Security best practice for target="_blank"
							className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-full transition duration-300 transform hover:scale-105 shadow-lg block mx-auto w-fit"
						>
							¡Quiero mi Workbook + Bonus!
						</a>
						<p className="text-sm text-gray-500 mt-4">
							(Tu correo ha sido guardado y serás parte de la comunidad
							@holabonitx).
						</p>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl relative">
				<h1 className="text-4xl font-extrabold text-center text-pink-800 mb-8 font-inter tracking-tight">
					@holabonitx
				</h1>
				{/* Display userId for debugging/demonstration purposes if needed */}
				{userId && (
					<p className="text-xs text-gray-400 text-center mb-4">
						User ID: {userId}
					</p>
				)}
				{renderContent()}
			</div>
		</div>
	);
};

export default App;