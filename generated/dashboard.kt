import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun GeneratedView() {
    Box(modifier = Modifier) {
        TopAppBar(
            title = { Text("MyApp") }
        )
        Column {
            TopAppBar(
                title = { Text("Dashboard") }
            )
            Column {
                Card(
                    modifier = Modifier
                ) {
                    Text(text = "Revenue $12,345 +12%")
                }
            }
            Column {
                Text(text = "© 2026 MyApp. All rights reserved.")
            }
        }
    }
}
