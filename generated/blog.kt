import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun GeneratedView() {
    Box(modifier = Modifier) {
        TopAppBar(
            title = { Text("My Blog") }
        )
        Column {
            Card(
                modifier = Modifier
            ) {
                Text(text = "Getting Started with TypeScript By Jane Doe · 5 min read TypeScript adds static typing to JavaScript, making your code more predictable and easier to debug. In this post, we explore the basics of TypeScript and how to set up your first project.")
            }
        }
        Column {
            Text(text = "© 2026 My Blog. All rights reserved.")
        }
    }
}
